let ace = require('ace');
let x_json = require('./x_json_highlight_rules');

var oop = ace.require("ace/lib/oop");
var TextHighlightRules = ace.require("ace/mode/text_highlight_rules").TextHighlightRules;

var InputHighlightRules = function () {

  function mergeTokens(/* ... */) {
    return [].concat.apply([], arguments);
  }

  function addEOL(tokens, reg, nextIfEOL, normalNext) {
    if (typeof reg == "object") {
      reg = reg.source;
    }
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
        { "token": "warning", "regex": "#!.*$" },
        { token: "comment", regex: /^#.*$/ },
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
      addEOL(["whitespace", "url.protocol_host", "url.slash"], /(\s+)(https?:\/\/[^?\/,]+)(\/)/, "start", "url"),
      addEOL(["whitespace", "url.protocol_host"], /(\s+)(https?:\/\/[^?\/,]+)/, "start", "url"),
      addEOL(["whitespace", "url.slash"], /(\s+)(\/)/, "start", "url"),
      addEOL(["whitespace"], /(\s+)/, "start", "url")
    ),
    "url": mergeTokens(
      addEOL(["url.part"], /([^?\/,\s]+)/, "start"),
      addEOL(["url.comma"], /(,)/, "start"),
      addEOL(["url.slash"], /(\/)/, "start"),
      addEOL(["url.questionmark"], /(\?)/, "start", "urlParams")
    ),
    "urlParams": mergeTokens(
      addEOL(["url.param", "url.equal", "url.value"], /([^&=]+)(=)([^&]*)/, "start"),
      addEOL(["url.param"], /([^&=]+)/, "start"),
      addEOL(["url.amp"], /(&)/, "start")
    )
  };

  x_json.addToRules(this);

  if (this.constructor === InputHighlightRules) {
    this.normalizeRules();
  }

};

oop.inherits(InputHighlightRules, TextHighlightRules);


module.exports.InputHighlightRules = InputHighlightRules;
