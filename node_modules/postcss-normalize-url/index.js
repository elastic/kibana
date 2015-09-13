'use strict';

var eachFunction = require('./lib/eachFunction');
var postcss = require('postcss');
var list = postcss.list;
var shorter = require('./lib/shorter');
var normalize = require('normalize-url');
var isAbsolute = require('is-absolute-url');
var path = require('path');
var assign = require('object-assign');

var multiline = /\\[\r\n]/;
var extractUrl = /^url\(([\s\S]*)\)(.*)?$/;
var unquote = /^("|')(.*)\1$/;
var escapeChars = /[\s\(\)'"]/;
var replaceEscapeChars = /([\s\(\)"'])/g;

function convert (url, options) {
    if (isAbsolute(url)) {
        return normalize(url, options);
    }
    return path.normalize(url);
}

function namespaceOptimiser (options) {
    return function (rule) {
        rule.params = list.space(rule.params).map(function (param) {
            if (/^url/.test(param)) {
                param = param.replace(/^url\((.*)\)$/, '$1');
            }
            return param.replace(/^("|')(.*)\1$/, function (_, quo, body) {
                return quo + convert(body.trim(), options) + quo;
            });
        }).join(' ');
    }
}

module.exports = postcss.plugin('postcss-normalize-url', function (options) {
    options = assign({
        normalizeProtocol: false,
        stripFragment: false
    }, options);

    return function (css) {
        css.eachDecl(function (decl) {
            decl.value = decl.value.replace(multiline, '');
            decl.value = eachFunction(decl.value, 'url', function (substring) {
                // Don't mangle embedded base64 or svg images
                if (~substring.indexOf('data:image/')) {
                    return substring;
                }
                var url = substring.replace(extractUrl, '$1').trim();
                url = url.replace(unquote, function (_, quote, body) {
                    return quote + convert(body.trim(), options) + quote;
                });
                var trimmed = url.replace(unquote, '$2').trim();
                var optimised = convert(trimmed, options);
                if (escapeChars.test(trimmed)) {
                    var isEscaped = trimmed.replace(replaceEscapeChars, '\\$1');
                    optimised = shorter(isEscaped, url);
                }
                return substring.replace(extractUrl, function (_, pre, post) {
                    if (post) {
                        return 'url(' + optimised + ')' + post;
                    }
                    return 'url(' + optimised + ')';
                });
            });
        });
        css.eachAtRule('namespace', namespaceOptimiser(options));
    };
});
