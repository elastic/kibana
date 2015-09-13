
var postcss = require('postcss');

module.exports = postcss.plugin('pseudoelements', function(options) {

  options = options || {};

  var selectors = options.selectors || [
    'before',
    'after',
    'first-letter',
    'first-line'
  ]

  var replacements = new RegExp('::(' + selectors.join('|') + ')', 'gi');

  return function(css) {
    css.eachRule(function(rule) {
      rule.selector = rule.selector.replace(replacements, ':$1');
    });
  }
});
