'use strict';

var postcss = require('postcss');
var list = postcss.list;
var shorter = require('./lib/shorter');
var intersection = require('./lib/intersection');
var uniqs = require('uniqs');
var identifiers = require('./lib/identifiers');
var assign = require('object-assign');

var keywords = [
    'sans-serif',
    'serif',
    'fantasy',
    'cursive',
    'monospace'
];

/**
 * No point in keeping the rest of the declaration after a keyword
 */
function removeAfterKeyword () {
    var hasKeyword = false;
    return function (family) {
        if (~keywords.indexOf(family)) {
            hasKeyword = true;
            return true;
        }
        return !hasKeyword;
    };
}

function unquote (value) {
    return value.replace(/^("|')(.*)\1$/, '$2').trim();
}

function optimiseFontFamily (opts, decl) {
    var values = list.comma(decl.value).map(function (value) {
        // Don't escape identifiers starting with digits
        if (/^[0-9]/.test(value) || !opts.removeQuotes) {
            return value;
        }
        var shorthand = [];
        var unquoted = '';
        list.space(value).forEach(function (id) {
            if (~identifiers.indexOf(id)) {
                shorthand.push(id);
            } else if (/(\d*?\.?\d)(%|rem|em|ex|in|cm|mm|pt|pc|px)(\/[\d\.]*)?$/.test(id)) {
                shorthand.push(id);
            } else {
                unquoted += unquote(id) + ' ';
            }
        });
        // There's only one identifier...
        if (!unquoted) {
            shorthand = [];
            unquoted = unquote(value);
        }
        var escaped = list.space(unquoted);
        // Ensure that any unquoted identifiers are not font keywords
        if (intersection(keywords, escaped)) {
            return value;
        }
        escaped = escaped.map(function (ident, i) {
            if (/^[^a-z]/i.test(escaped[i + 1])) {
                return ident + '\\';
            }
            if (!/^[^a-z\d\xa0-\uffff_-]/i.test(ident)) {
                return ident.replace(/([^a-z\d\xa0-\uffff_-])/gi, '\\$1');
            }
            if (/^[^a-z]/i.test(ident) && i < 1) {
                return '\\' + ident;
            }
            return ident;
        }).join(' ');
        if (shorthand.length) {
            var s = shorthand.join(' ') + ' ';
            return shorter(s + escaped, s + '"' + unquoted.trim() + '"');
        }

        return shorter(escaped, value);
    });
    if (opts.removeAfterKeyword) {
        values = values.filter(removeAfterKeyword());
    }
    if (opts.removeDuplicates) {
        values = uniqs(values);
    }
    decl.value = values.join(',');
}

module.exports = postcss.plugin('postcss-font-family', function (opts) {
    opts = assign({
        removeAfterKeyword: true,
        removeDuplicates: true,
        removeQuotes: true
    }, opts);

    return function (css) {
        css.eachDecl(/^font/, optimiseFontFamily.bind(this, opts));
    };
});
