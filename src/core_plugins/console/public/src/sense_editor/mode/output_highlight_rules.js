let ace = require('ace');
require('ace/mode-json');
let x_json = require('./x_json_highlight_rules');

var oop = ace.require("ace/lib/oop");
var JsonHighlightRules = ace.require("ace/mode/json_highlight_rules").JsonHighlightRules;

var OutputJsonHighlightRules = function () {

  this.$rules = {};

  x_json.addToRules(this, 'start');

  this.$rules.start.unshift(
    {
      "token": "warning",
      "regex": "#!.*$"
    },
    {
      "token": "comment",
      "regex": "#.*$"
    }
  );

  if (this.constructor === OutputJsonHighlightRules) {
    this.normalizeRules();
  }

};

oop.inherits(OutputJsonHighlightRules, JsonHighlightRules);

module.exports.OutputJsonHighlightRules = OutputJsonHighlightRules;
