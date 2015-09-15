'use strict';

var balanced = require('node-balanced');
var CommentRemover = require('./lib/commentRemover');
var postcss = require('postcss');
var space = postcss.list.space;

module.exports = postcss.plugin('postcss-discard-comments', function (options) {
    return function (css) {
        var remover = new CommentRemover(options || {});

        function replaceComments (source) {
            if (!source) {
                return;
            }
            var b = balanced.replacements({
                source: source,
                open: '/*',
                close: '*/',
                replace: function (comment, head, tail) {
                    if (remover.canRemove(comment)) {
                        return ' ';
                    }
                    return head + comment + tail;
                }
            });
            return space(b).join(' ');
        }

        css.eachInside(function (node) {
            if (node.type === 'comment' && remover.canRemove(node.text)) {
                return node.removeSelf();
            }

            if (node.between) {
                node.between = replaceComments(node.between);
            }

            if (node.type === 'decl') {
                if (node._value && node._value.raw) {
                    var replaced = replaceComments(node._value.raw);
                    node._value.raw = node._value.value = node.value = replaced;
                }
                if (node._important) {
                    node._important = replaceComments(node._important);
                    var b = balanced.matches({
                        source: node._important,
                        open: '/*',
                        close: '*/'
                    });
                    node._important = b.length ? node._important : '!important';
                }
                return;
            }

            if (node.type === 'rule' && node._selector && node._selector.raw) {
                node._selector.raw = replaceComments(node._selector.raw);
                return;
            }

            if (node.type === 'atrule') {
                if (node.afterName) {
                    var commentsReplaced = replaceComments(node.afterName);
                    if (!commentsReplaced.length) {
                        node.afterName = commentsReplaced + ' ';
                    } else {
                        node.afterName = ' ' + commentsReplaced + ' ';
                    }
                }
                if (node._params && node._params.raw) {
                    node._params.raw = replaceComments(node._params.raw);
                }
            }
        });
    };
});
