"use strict";

var GrammarError = require("../../grammar-error"),
    asts         = require("../asts"),
    visitor      = require("../visitor");

/*
 * Reports expressions that don't consume any input inside |*| or |+| in the
 * grammar, which prevents infinite loops in the generated parser.
 */
function reportInfiniteLoops(ast) {
  var check = visitor.build({
    zero_or_more: function(node) {
      if (!asts.alwaysAdvancesOnSuccess(ast, node.expression)) {
        throw new GrammarError("Infinite loop detected.", node.location);
      }
    },

    one_or_more: function(node) {
      if (!asts.alwaysAdvancesOnSuccess(ast, node.expression)) {
        throw new GrammarError("Infinite loop detected.", node.location);
      }
    }
  });

  check(ast);
}

module.exports = reportInfiniteLoops;
