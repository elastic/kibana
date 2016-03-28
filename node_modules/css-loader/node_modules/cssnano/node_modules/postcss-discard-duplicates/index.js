'use strict';

var postcss = require('postcss');

function dedupe (root) {
    root.each(function (node) {
        if (node.nodes) { dedupe(node); }
    });

    root.each(function (node, index) {
        if (node.type === 'comment') { return; }

        var nodes = node.parent.nodes;
        var toString = node.toString();
        var result = [node];
        var i = index + 1;
        var max = nodes.length;

        for (; i < max; i++) {
            if (nodes[i].toString() === toString) {
                result.push(nodes[i]);
            }
        }

        for(i = result.length - 2; ~i; i -= 1) {
            result[i].removeSelf();
        }
    });
}

module.exports = postcss.plugin('postcss-discard-duplicates', function () {
    return dedupe;
});
