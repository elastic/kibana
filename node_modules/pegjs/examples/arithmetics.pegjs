/*
 * Simple Arithmetics Grammar
 * ==========================
 *
 * Accepts expressions like "2 * (3 + 4)" and computes their value.
 */

{
  function combine(first, rest, combiners) {
    var result = first, i;

    for (i = 0; i < rest.length; i++) {
      result = combiners[rest[i][1]](result, rest[i][3]);
    }

    return result;
  }
}

Expression
  = first:Term rest:(_ ("+" / "-") _ Term)* {
      return combine(first, rest, {
        "+": function(left, right) { return left + right; },
        "-": function(left, right) { return left - right; }
      });
    }

Term
  = first:Factor rest:(_ ("*" / "/") _ Factor)* {
      return combine(first, rest, {
        "*": function(left, right) { return left * right; },
        "/": function(left, right) { return left / right; }
      });
    }

Factor
  = "(" _ expr:Expression _ ")" { return expr; }
  / Integer

Integer "integer"
  = [0-9]+ { return parseInt(text(), 10); }

_ "whitespace"
  = [ \t\n\r]*
