let ace = require('ace');
let ace_mode_json = require('ace/mode-json');

var oop = ace.require("ace/lib/oop");
var JsonHighlightRules = ace.require("ace/mode/json_highlight_rules").JsonHighlightRules;

var OutputJsonHighlightRules = function () {

  // regexp must not have capturing parentheses. Use (?:) instead.
  // regexps are ordered -> the first match is used
  this.$rules = new JsonHighlightRules().getRules();

  this.$rules.start.unshift(
    {
      "token": "comment",
      "regex": "#.*$"
    }
  );

};

oop.inherits(OutputJsonHighlightRules, JsonHighlightRules);

module.exports.OutputJsonHighlightRules = OutputJsonHighlightRules;
