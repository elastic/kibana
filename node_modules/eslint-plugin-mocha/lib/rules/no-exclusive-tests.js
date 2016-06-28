'use strict';

module.exports = function (context) {
    var mochaTestFunctions = [
        'it',
        'describe',
        'suite',
        'test',
        'context'
    ];

    function matchesMochaTestFunction(object) {
        return object && mochaTestFunctions.indexOf(object.name) !== -1;
    }

    function isPropertyNamedOnly(property) {
        return property && (property.name === 'only' || property.value === 'only');
    }

    function isCallToMochasOnlyFunction(callee) {
        return callee.type === 'MemberExpression' &&
           matchesMochaTestFunction(callee.object) &&
           isPropertyNamedOnly(callee.property);
    }

    function createAutofixFunction(callee) {
        var endRangeOfMemberExpression = callee.range[1],
            endRangeOfMemberExpressionObject = callee.object.range[1],
            rangeToRemove = [ endRangeOfMemberExpressionObject, endRangeOfMemberExpression ];

        return function removeOnlyProperty(fixer) {
            return fixer.removeRange(rangeToRemove);
        };
    }

    return {
        CallExpression: function (node) {
            var callee = node.callee;

            if (callee && isCallToMochasOnlyFunction(callee)) {
                context.report({
                    node: callee.property,
                    message: 'Unexpected exclusive mocha test.',
                    fix: createAutofixFunction(callee)
                });
            }
        }
    };
};
