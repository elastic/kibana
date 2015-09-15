function stringifyNode(node) {
    var type = node.type;

    if (type === 'word' || type === 'space') {
        return node.value;
    } else if (type === 'string') {
        return (node.quote || '') + node.value + (node.quote || '');
    } else if (type === 'div') {
        return (node.before || '') + node.value + (node.after || '');
    } else if (Array.isArray(node.nodes)) {
        if (type === 'function') {
            return node.value + '(' + stringify(node.nodes) + ')';
        } else {
            return stringify(node.nodes);
        }
    } else {
        return node.value;
    }
}

function stringify(nodes) {
    if (Array.isArray(nodes)) {
        return nodes.map(stringifyNode).join('');
    } else {
        return stringifyNode(nodes);
    }
};

module.exports = stringify;
