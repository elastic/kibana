var d3 = require('d3');
var _ = require('lodash');

// Adds event listeners to DOM elements
function events() {
  var processor = function (e) { return e; };
  var listeners = {};
  var element;

  function control(selection) {
    selection.each(function () {
      if (!element) {
        element = d3.select(this);
      }

      d3.entries(listeners).forEach(function (d) {
        svg.on(d.key, function () {
          d3.event.stopPropagation(); // => event.stopPropagation()

          _.forEach(d.value, function (listener) {
            listener.call(this, processor(d3.event));
          });
        });
      });
    });
  }

  // Public API
  control.processor = function (v) {
    if (!arguments.length) { return processor; }
    processor = _.isFunction(v) ? v : processor;
    return control;
  };

  control.listeners = function (v) {
    if (!arguments.length) { return listeners; }
    listeners = _.isPlainObject(v) ? v : listeners;
    return control;
  };

  return control;
};

module.exports = events;
