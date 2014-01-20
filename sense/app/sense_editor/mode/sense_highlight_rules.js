/* jshint -W015 */

define(['require', 'exports', 'module' , 'ace'], function (require, exports, module, ace) {
  'use strict';

  var oop = ace.require("ace/lib/oop");
  var TextHighlightRules = ace.require("ace/mode/text_highlight_rules").TextHighlightRules;

  var SenseJsonHighlightRules = function () {

    function mergeTokens(/* ... */) {
      return [].concat.apply([], arguments);
    }

    function addEOL(tokens, reg, nextIfEOL, normalNext) {
      if (typeof reg == "object") reg = reg.source;
      return [
        { token: tokens.concat(["whitespace"]), regex: reg + "(\\s*)$", next: nextIfEOL },
        { token: tokens, regex: reg, next: normalNext }
      ];
    }

    // regexp must not have capturing parentheses. Use (?:) instead.
    // regexps are ordered -> the first match is used
    /*jshint -W015 */
    this.$rules = {
      "start": mergeTokens([
        { token: "comment", regex: /^#.*$/},
        { token: "paren.lparen", regex: "{", next: "json", push: true }
      ],
        addEOL(["method"], /([a-zA-Z]+)/, "start", "method_sep")
        ,
        [
          {
            token: "whitespace",
            regex: "\\s+"
          },
          {
            token: "text",
            regex: ".+?"
          }
        ]),
      "method_sep": mergeTokens(
        addEOL(["whitespace", "url.slash"], /(\s+)(\/)/, "start", "indices"),
        addEOL(["whitespace"], /(\s+)/, "start", "indices")
      ),
      "indices": mergeTokens(
        addEOL(["url.scheme", "url.host", "url.slash"], /([^:]+:\/\/)([^?\/\s]*)(\/?)/, "start"),
        addEOL(["url.index"], /(_all)/, "start"),
        addEOL(["url.endpoint"], /(_[^\/?]+)/, "start", "urlRest"),
        addEOL(["url.index"], /([^\/?,]+)/, "start"),
        addEOL(["url.comma"], /(,)/, "start"),
        addEOL(["url.slash"], /(\/)/, "start", "types"),
        addEOL(["url.questionmark"], /(\?)/, "start", "urlParams")
      ),
      "types": mergeTokens(
        addEOL(["url.endpoint"], /(_[^\/?]+)/, "start", "urlRest"),
        addEOL(["url.type"], /([^\/?,]+)/, "start"),
        addEOL(["url.comma"], /(,)/, "start"),
        addEOL(["url.slash"], /(\/)/, "start", "id"),
        addEOL(["url.questionmark"], /(\?)/, "start", "urlParams")
      ),
      "id": mergeTokens(
        addEOL(["url.endpoint"], /(_[^\/?]+)/, "start", "urlRest"),
        addEOL(["url.id"], /([^\/?]+)/, "start"),
        addEOL(["url.slash"], /(\/)/, "start", "urlRest"),
        addEOL(["url.questionmark"], /(\?)/, "start", "urlParams")
      ),
      "urlRest": mergeTokens(
        addEOL(["url.part"], /([^?\/]+)/, "start"),
        addEOL(["url.slash"], /(\/)/, "start"),
        addEOL(["url.questionmark"], /(\?)/, "start", "urlParams")
      ),
      "urlParams": mergeTokens(
        addEOL(["url.param", "url.equal", "url.value"], /([^&=]+)(=)([^&]*)/, "start"),
        addEOL(["url.param"], /([^&=]+)/, "start"),
        addEOL(["url.amp"], /(&)/, "start")
      ),


      "json": [
        {
          token: "variable", // single line
          regex: '["](?:(?:\\\\.)|(?:[^"\\\\]))*?["]\\s*(?=:)'
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
          next: "json",
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
      ],
      "double_q_string": [
        {
          token: "string",
          regex: '[^"]+'
        },
        {
          token: "punctuation.end_quote",
          regex: '"',
          next: "json"
        },
        {
          token: "string",
          regex: "",
          next: "json"
        }
      ]
    }

    if (this.constructor === SenseJsonHighlightRules)
      this.normalizeRules();
  };

  oop.inherits(SenseJsonHighlightRules, TextHighlightRules);

  exports.SenseJsonHighlightRules = SenseJsonHighlightRules;

});
