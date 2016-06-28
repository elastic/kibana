module.exports = function (nodes) {
    if (Array.isArray(nodes)) {
        if (nodes.length) {
            if (nodes[0].type === 'space') {
                nodes.shift();
            }
        }

        if (nodes.length) {
            if (nodes[nodes.length - 1].type === 'space') {
                nodes.pop();
            }
        }
    }

    return nodes;
};
