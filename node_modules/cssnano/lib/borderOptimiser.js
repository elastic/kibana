'use strict';

var hasLength = require('./util/hasLength');
var list = require('postcss').list;
var removeSelf = require('./util/removeSelf');
var canMergeProperties = require('./util/canMergeProperties');

function filterNode (prop) {
    return function (decl) {
        return decl.prop === prop && list.space(decl.value).length === 1;
    };
}

function borderOptimiser (rule) {
    var properties = [
        rule.nodes.filter(filterNode('border-color')),
        rule.nodes.filter(filterNode('border-style')),
        rule.nodes.filter(filterNode('border-width'))
    ];
    if (
        hasLength(properties[0], properties[1], properties[2]) &&
        canMergeProperties(properties)
    ) {
        var optimised = properties[1][0].clone({
            prop: 'border',
            value: [
                properties[2][0].value,
                properties[1][0].value,
                properties[0][0].value
            ].join(' ')
        });
        optimised.between = ':';
        properties[1][0].replaceWith(optimised);
        [properties[2][0], properties[0][0]].forEach(removeSelf);
    }
}

module.exports = function () {
    return function (css) {
        css.eachRule(borderOptimiser);
    };
};
