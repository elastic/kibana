'use strict';

var acorn = require('acorn');
var walk = require('acorn/dist/walk');

function isScope(node) {
  return node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration' || node.type === 'Program';
}
function isBlockScope(node) {
  return node.type === 'BlockStatement' || isScope(node);
}

function declaresArguments(node) {
  return node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration' || node.type === 'ArrowFunction';
}
function declaresThis(node) {
  return node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration';
}

function reallyParse(source) {
  try {
    return acorn.parse(source, {
      ecmaVersion: 6,
      allowReturnOutsideFunction: true,
      allowImportExportEverywhere: true,
      allowHashBang: true
    });
  } catch (ex) {
    return acorn.parse(source, {
      ecmaVersion: 5,
      allowReturnOutsideFunction: true,
      allowImportExportEverywhere: true,
      allowHashBang: true
    });
  }
}
module.exports = findGlobals;
module.exports.parse = reallyParse;
function findGlobals(source) {
  var globals = [];
  var ast = typeof source === 'string' ?
    ast = reallyParse(source) :
    source;
  if (!(ast && typeof ast === 'object' && ast.type === 'Program')) {
    throw new TypeError('Source must be either a string of JavaScript or an acorn AST');
  }
  var declareFunction = function (node) {
    var fn = node;
    fn.locals = fn.locals || {};
    node.params.forEach(function (node) {
      fn.locals[node.name] = true;
    });
    if (node.id) {
      fn.locals[node.id.name] = true;
    }
  }
  walk.ancestor(ast, {
    'VariableDeclaration': function (node, parents) {
      var parent = null;
      for (var i = parents.length - 1; i >= 0 && parent === null; i--) {
        if (node.kind === 'var' ? isScope(parents[i]) : isBlockScope(parents[i])) {
          parent = parents[i];
        }
      }
      parent.locals = parent.locals || {};
      node.declarations.forEach(function (declaration) {
        parent.locals[declaration.id.name] = true;
      });
    },
    'FunctionDeclaration': function (node, parents) {
      var parent = null;
      for (var i = parents.length - 2; i >= 0 && parent === null; i--) {
        if (isScope(parents[i])) {
          parent = parents[i];
        }
      }
      parent.locals = parent.locals || {};
      parent.locals[node.id.name] = true;
      declareFunction(node);
    },
    'Function': declareFunction,
    'TryStatement': function (node) {
      node.handler.body.locals = node.handler.body.locals || {};
      node.handler.body.locals[node.handler.param.name] = true;
    },
    'ImportDefaultSpecifier': function (node) {
      if (node.local.type === 'Identifier') {
        ast.locals = ast.locals || {};
        ast.locals[node.local.name] = true;
      }
    },
    'ImportSpecifier': function (node) {
      var id = node.local ? node.local : node.imported;
      if (id.type === 'Identifier') {
        ast.locals = ast.locals || {};
        ast.locals[id.name] = true;
      }
    },
    'ImportNamespaceSpecifier': function (node) {
      if (node.local.type === 'Identifier') {
        ast.locals = ast.locals || {};
        ast.locals[node.local.name] = true;
      }
    }
  });
  function identifier(node, parents) {
    var name = node.name;
    if (name === 'undefined') return;
    for (var i = 0; i < parents.length; i++) {
      if (name === 'arguments' && declaresArguments(parents[i])) {
        return;
      }
      if (parents[i].locals && name in parents[i].locals) {
        return;
      }
    }
    if (
      parents[parents.length - 2] &&
      parents[parents.length - 2].type === 'TryStatement' &&
      parents[parents.length - 2].handler &&
      node === parents[parents.length - 2].handler.param
    ) {
      return;
    }
    node.parents = parents;
    globals.push(node);
  }
  walk.ancestor(ast, {
    'VariablePattern': identifier,
    'Identifier': identifier,
    'ThisExpression': function (node, parents) {
      for (var i = 0; i < parents.length; i++) {
        if (declaresThis(parents[i])) {
          return;
        }
      }
      node.parents = parents;
      globals.push(node);
    }
  });
  var groupedGlobals = {};
  globals.forEach(function (node) {
    groupedGlobals[node.name] = (groupedGlobals[node.name] || []);
    groupedGlobals[node.name].push(node);
  });
  return Object.keys(groupedGlobals).sort().map(function (name) {
    return {name: name, nodes: groupedGlobals[name]};
  });
}
