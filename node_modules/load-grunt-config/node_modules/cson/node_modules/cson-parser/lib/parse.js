
/*
Copyright (c) 2014, Groupon, Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions
are met:

Redistributions of source code must retain the above copyright notice,
this list of conditions and the following disclaimer.

Redistributions in binary form must reproduce the above copyright
notice, this list of conditions and the following disclaimer in the
documentation and/or other materials provided with the distribution.

Neither the name of GROUPON nor the names of its contributors may be
used to endorse or promote products derived from this software without
specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
var defaultReviver, getFunctionNameIE, nodeTypeString, nodes, parse, parseRegExpLiteral, parseStringLiteral, runInThisContext, syntaxErrorMessage;

runInThisContext = require('vm').runInThisContext;

nodes = require('coffee-script').nodes;

defaultReviver = function(key, value) {
  return value;
};

getFunctionNameIE = function(fn) {
  return csNode.constructor.toString().match(/^function\s*([^( ]+)/)[1];
};

nodeTypeString = function(csNode) {
  var ref;
  return (ref = csNode.constructor.name) != null ? ref : getFunctionNameIE(csNode.constructor);
};

syntaxErrorMessage = function(csNode, msg) {
  var column, columnIdx, line, lineIdx, ref;
  ref = csNode.locationData, lineIdx = ref.first_line, columnIdx = ref.first_column;
  if (lineIdx != null) {
    line = lineIdx + 1;
  }
  if (columnIdx != null) {
    column = columnIdx + 1;
  }
  return "Syntax error on line " + line + ", column " + column + ": " + msg;
};

parseStringLiteral = function(literal) {
  return runInThisContext(literal);
};

parseRegExpLiteral = function(literal) {
  return runInThisContext(literal);
};

parse = function(source, reviver) {
  var coffeeAst, contextObj, isLiteral, nodeTransforms, parsed, transformKey, transformNode;
  if (reviver == null) {
    reviver = defaultReviver;
  }
  nodeTransforms = {
    Block: function(node) {
      var expressions;
      expressions = node.expressions;
      if (!expressions || expressions.length !== 1) {
        throw new SyntaxError(syntaxErrorMessage(node, 'One top level value expected'));
      }
      return transformNode(expressions[0]);
    },
    Value: function(node) {
      return transformNode(node.base);
    },
    Bool: function(node) {
      return node.val === 'true';
    },
    Null: function() {
      return null;
    },
    Literal: function(node) {
      var err, error, value;
      value = node.value;
      try {
        switch (value.charAt(0)) {
          case "'":
          case '"':
            return parseStringLiteral(value);
          case '/':
            return parseRegExpLiteral(value);
          default:
            return JSON.parse(value);
        }
      } catch (error) {
        err = error;
        throw new SyntaxError(syntaxErrorMessage(node, err.message));
      }
    },
    Arr: function(node) {
      return node.objects.map(transformNode);
    },
    Obj: function(node) {
      return node.properties.reduce(function(outObject, property) {
        var keyName, value, variable;
        variable = property.variable, value = property.value;
        if (!variable) {
          return outObject;
        }
        keyName = transformKey(variable);
        value = transformNode(value);
        outObject[keyName] = reviver.call(outObject, keyName, value);
        return outObject;
      }, {});
    },
    Op: function(node) {
      var left, right;
      if (node.second != null) {
        left = transformNode(node.first);
        right = transformNode(node.second);
        switch (node.operator) {
          case '-':
            return left - right;
          case '+':
            return left + right;
          case '*':
            return left * right;
          case '/':
            return left / right;
          case '%':
            return left % right;
          case '&':
            return left & right;
          case '|':
            return left | right;
          case '^':
            return left ^ right;
          case '<<':
            return left << right;
          case '>>>':
            return left >>> right;
          case '>>':
            return left >> right;
          default:
            throw new SyntaxError(syntaxErrorMessage(node, "Unknown binary operator " + node.operator));
        }
      } else {
        switch (node.operator) {
          case '-':
            return -transformNode(node.first);
          case '~':
            return ~transformNode(node.first);
          default:
            throw new SyntaxError(syntaxErrorMessage(node, "Unknown unary operator " + node.operator));
        }
      }
    },
    Parens: function(node) {
      var expressions;
      expressions = node.body.expressions;
      if (!expressions || expressions.length !== 1) {
        throw new SyntaxError(syntaxErrorMessage(node, 'Parenthesis may only contain one expression'));
      }
      return transformNode(expressions[0]);
    }
  };
  isLiteral = function(csNode) {
    return LiteralTypes.some(function(LiteralType) {
      return csNode instanceof LiteralType;
    });
  };
  transformKey = function(csNode) {
    var type, value;
    type = nodeTypeString(csNode);
    if (type !== 'Value') {
      throw new SyntaxError(syntaxErrorMessage(csNode, type + " used as key"));
    }
    value = csNode.base.value;
    switch (value.charAt(0)) {
      case "'":
      case '"':
        return parseStringLiteral(value);
      default:
        return value;
    }
  };
  transformNode = function(csNode) {
    var transform, type;
    type = nodeTypeString(csNode);
    transform = nodeTransforms[type];
    if (!transform) {
      throw new SyntaxError(syntaxErrorMessage(csNode, "Unexpected " + type));
    }
    return transform(csNode);
  };
  if (typeof reviver !== 'function') {
    throw new TypeError("reviver has to be a function");
  }
  coffeeAst = nodes(source.toString('utf8'));
  parsed = transformNode(coffeeAst);
  if (reviver === defaultReviver) {
    return parsed;
  }
  contextObj = {};
  contextObj[''] = parsed;
  return reviver.call(contextObj, '', parsed);
};

module.exports = parse;
