define(function (require) {
  var _ = require('lodash');

  /**
   * just a place to put feature detection checks
   */
  return {
    cssFilters: (function () {
      var e = document.createElement('img');
      var rules = ['webkitFilter', 'mozFilter', 'msFilter', 'filter'];
      var test = 'grayscale(1)';
      rules.forEach(function (rule) { e.style[rule] = test; });

      document.body.appendChild(e);
      var styles = window.getComputedStyle(e);
      var can = _(styles).pick(rules).contains(test);
      document.body.removeChild(e);

      return can;
    }())
  };

});
