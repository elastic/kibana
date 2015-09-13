'use strict';

/**
 * Remove a node from the AST; wrapped method to use
 * in array iterators.
 * @param  {node} node The node to remove
 */
module.exports = function removeSelf (node) {
    return node.removeSelf();
};
