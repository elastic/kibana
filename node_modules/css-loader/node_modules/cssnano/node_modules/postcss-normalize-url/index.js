'use strict';

var postcss = require('postcss');
var parser = require('postcss-value-parser');
var trimSpaceNodes = parser.trim;
var stringify = parser.stringify;
var normalize = require('normalize-url');
var isAbsolute = require('is-absolute-url');
var path = require('path');
var assign = require('object-assign');

var multiline = /\\[\r\n]/;
var escapeChars = /([\s\(\)"'])/g;

function convert (url, options) {
    if (isAbsolute(url) || !url.indexOf('//')) {
        return normalize(url, options);
    }
    return path.normalize(url).replace(new RegExp('\\' + path.sep, 'g'), '/');
}

function namespaceOptimiser (options) {
    return function (rule) {
        rule.params = parser(rule.params).walk(function (node, i, parentNodes) {
            var nodes = node.nodes;
            if (node.type === 'function' && node.value === 'url') {
                trimSpaceNodes(node.nodes);
                if (nodes.length === 1 && nodes[0].type === 'string' && nodes[0].quote) {
                    node = nodes[0];
                } else {
                    node = { type: 'string', quote: '"', value: stringify(nodes) };
                }
                parentNodes[i] = node;
            }

            if (node.type === 'string') {
                node.value = convert(node.value.trim(), options);
            }

            return false;
        }).toString();
    };
}

function transformDecl(decl, opts) {
    decl.value = decl.value.replace(multiline, '');
    decl.value = parser(decl.value).walk('url', function (node) {
        var nodes = node.nodes;
        var url;
        var escaped;

        if (node.type !== 'function') {
            return;
        }

        trimSpaceNodes(nodes);

        if (nodes.length === 1 && nodes[0].type === 'string' && nodes[0].quote) {
            url = nodes[0];
        } else {
            url = { type: 'word', value: stringify(nodes) };
        }
        node.nodes = [url];

        if (~url.value.indexOf('data:image/') || ~url.value.indexOf('data:application/')) {
            return false;
        }

        url.value = url.value.trim()
        url.value = convert(url.value, opts);

        if (escapeChars.test(url.value)) {
            escaped = url.value.replace(escapeChars, '\\$1');
            if (escaped.length < url.value.length + (url.type === 'string' ? 2 : 0)) {
                url.value = escaped;
                url.type = 'word';
            }
        } else {
            url.type = 'word';
        }

        return false;
    }).toString();
}

module.exports = postcss.plugin('postcss-normalize-url', function (opts) {
    opts = assign({
        normalizeProtocol: false,
        stripFragment: false,
        stripWWW: true
    }, opts);

    return function (css) {
        css.eachInside(function (node) {
            if (node.type === 'decl') {
                return transformDecl(node, opts);
            }
            if (node.type === 'atrule' && node.name === 'namespace') {
                return namespaceOptimiser(opts)(node);
            }
        });
    };
});
