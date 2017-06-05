let _ = require("lodash");
let ScriptHighlightRules = require("./script_highlight_rules").ScriptHighlightRules;

var jsonRules = function (root) {
  root = root ? root : "json";
  var rules = {};
  rules[root] = [
      {
        token: ["variable", "whitespace", "ace.punctuation.colon", "whitespace", "punctuation.start_triple_quote"],
        regex: '("script"|"inline")(\\s*?)(:)(\\s*?)(""")',
        next: "script-start",
        merge: false,
        push: true
      },
      {
        token: "variable", // single line
        regex: '["](?:(?:\\\\.)|(?:[^"\\\\]))*?["]\\s*(?=:)'
      },
      {
        token: "punctuation.start_triple_quote",
        regex: '"""',
        next: "string_literal",
        merge: false,
        push: true
      },
      {
        token: "string", // single line
        regex: '["](?:(?:\\\\.)|(?:[^"\\\\]))*?["]'
      },
      {
        token: "constant.numeric", // hex
        regex: "0[xX][0-9a-fA-F]+\\b"
      },
      {
        token: "constant.numeric", // float
        regex: "[+-]?\\d+(?:(?:\\.\\d*)?(?:[eE][+-]?\\d+)?)?\\b"
      },
      {
        token: "constant.language.boolean",
        regex: "(?:true|false)\\b"
      },
      {
        token: "invalid.illegal", // single quoted strings are not allowed
        regex: "['](?:(?:\\\\.)|(?:[^'\\\\]))*?[']"
      },
      {
        token: "invalid.illegal", // comments are not allowed
        regex: "\\/\\/.*$"
      },
      {
        token: "paren.lparen",
        merge: false,
        regex: "{",
        next: root,
        push: true
      },
      {
        token: "paren.lparen",
        merge: false,
        regex: "[[(]"
      },
      {
        token: "paren.rparen",
        merge: false,
        regex: "[\\])]"
      },
      {
        token: "paren.rparen",
        regex: "}",
        merge: false,
        next: "pop"
      },
      {
        token: "punctuation.comma",
        regex: ","
      },
      {
        token: "punctuation.colon",
        regex: ":"
      },
      {
        token: "whitespace",
        regex: "\\s+"
      },
      {
        token: "text",
        regex: ".+?"
      }
    ];
  rules["string_literal"] = [
      {
        token: "punctuation.end_triple_quote",
        regex: '"""',
        next: "pop"
      },
      {
        token: "multi_string",
        regex: "."
      }
    ];
 return rules;
};

module.exports.addToRules = function (otherRules, embedUnder) {
  otherRules.$rules = _.defaultsDeep(otherRules.$rules, jsonRules(embedUnder));
  otherRules.embedRules(ScriptHighlightRules, "script-", [{
     token: "punctuation.end_triple_quote",
     regex: '"""',
     next  : "pop",
  }]);
}
