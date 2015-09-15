'use strict';
var postcss = require('postcss');

function discardEmpty(node) {
	if (node.nodes) { node.each(discardEmpty); }

	if (
		(node.type === 'decl' && !node.value) ||
		(node.type === 'rule' && !node.selector || (node.nodes && !node.nodes.length)) ||
		(node.type === 'atrule' && ((!node.nodes && !node.params) || (!node.params && !node.nodes.length)))
		) {
		node.removeSelf();
	}
}

module.exports = postcss.plugin('postcss-discard-empty', function () {
	return function (css) {
		css.each(discardEmpty);
	};
});
