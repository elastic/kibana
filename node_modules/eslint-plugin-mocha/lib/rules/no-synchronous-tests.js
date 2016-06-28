'use strict';

var R = require('ramda');

module.exports = function (context) {
    var possibleAsyncFunctionNames = [
        'it',
        'it.only',
        'test',
        'test.only',
        'before',
        'after',
        'beforeEach',
        'afterEach'
    ];

    function getCalleeName(callee) {
        if (callee.type === 'MemberExpression') {
             return callee.object.name + '.' + callee.property.name;
        }

        return callee.name;
    }

    function hasParentMochaFunctionCall(functionExpression) {
        var name;

        if (functionExpression.parent && functionExpression.parent.type === 'CallExpression') {
            name = getCalleeName(functionExpression.parent.callee);
            return possibleAsyncFunctionNames.indexOf(name) > -1;
        }

        return false;
    }

    function hasAsyncCallback(functionExpression) {
        return functionExpression.params.length === 1;
    }

    function findPromiseReturnStatement(nodes) {
      return R.find(function (node) {
        return node.type === 'ReturnStatement' && node.argument && node.argument.type !== 'Literal';
      }, nodes);
    }

    function checkPromiseReturn(functionExpression) {
        var bodyStatement = functionExpression.body,
            returnStatement = null;

        if (bodyStatement.type === 'BlockStatement') {
            returnStatement = findPromiseReturnStatement(functionExpression.body.body);
        } else if (bodyStatement.type === 'CallExpression') {
            //  allow arrow statements calling a promise with implicit return.
            returnStatement = bodyStatement;
        }

        if (!returnStatement) {
            context.report(functionExpression, 'Unexpected synchronous test.');
        }
    }

    function check(node) {
        if (hasParentMochaFunctionCall(node) && !hasAsyncCallback(node)) {
            checkPromiseReturn(node);
        }
    }

    return {
        FunctionExpression: check,
        ArrowFunctionExpression: check
    };
};
