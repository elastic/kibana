"use strict";

var arrays  = require("../utils/arrays"),
    visitor = require("./visitor");

/* AST utilities. */
var asts = {
  findRule: function(ast, name) {
    return arrays.find(ast.rules, function(r) { return r.name === name; });
  },

  indexOfRule: function(ast, name) {
    return arrays.indexOf(ast.rules, function(r) { return r.name === name; });
  },

  alwaysAdvancesOnSuccess: function(ast, node) {
    function advancesTrue()  { return true;  }
    function advancesFalse() { return false; }

    function advancesExpression(node) {
      return advances(node.expression);
    }

    var advances = visitor.build({
      rule:  advancesExpression,
      named: advancesExpression,

      choice: function(node) {
        return arrays.every(node.alternatives, advances);
      },

      action: advancesExpression,

      sequence: function(node) {
        return arrays.some(node.elements, advances);
      },

      labeled:      advancesExpression,
      text:         advancesExpression,
      simple_and:   advancesFalse,
      simple_not:   advancesFalse,
      optional:     advancesFalse,
      zero_or_more: advancesFalse,
      one_or_more:  advancesExpression,
      semantic_and: advancesFalse,
      semantic_not: advancesFalse,

      rule_ref: function(node) {
        return advances(asts.findRule(ast, node.name));
      },

      literal: function(node) {
        return node.value !== "";
      },

      "class": advancesTrue,
      any:     advancesTrue
    });

    return advances(node);
  }
};

module.exports = asts;
