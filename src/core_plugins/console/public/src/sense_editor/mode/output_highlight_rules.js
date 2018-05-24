const ace = require('ace');
import { addToRules } from './x_json_highlight_rules';

const oop = ace.acequire('ace/lib/oop');
const JsonHighlightRules = ace.acequire('ace/mode/json_highlight_rules').JsonHighlightRules;

export function OutputJsonHighlightRules() {

  this.$rules = {};

  addToRules(this, 'start');

  this.$rules.start.unshift(
    {
      'token': 'warning',
      'regex': '#!.*$'
    },
    {
      'token': 'comment',
      'regex': '#.*$'
    }
  );

  if (this.constructor === OutputJsonHighlightRules) {
    this.normalizeRules();
  }

}

oop.inherits(OutputJsonHighlightRules, JsonHighlightRules);
