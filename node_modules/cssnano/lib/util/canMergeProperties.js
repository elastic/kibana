'use strict';

var flatten = require('flatten');

function important (node) {
    return node.important;
}

function unimportant (node) {
    return !node.important;
}

module.exports = function canMergeProperties (/** props... */) {
    var props = flatten(Array.prototype.slice.call(arguments));
    return props.every(important) || props.every(unimportant);
};
