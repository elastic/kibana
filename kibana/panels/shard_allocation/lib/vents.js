define(function (require) {
  'use strict';
  var _ = require('lodash');
  var vents = {};
  return {
    vents: vents,
    on: function (id, cb) {
      if (!_.isArray(vents[id])) {
        vents[id] = [];
      }
      vents[id].push(cb);
    }, 
    clear: function (id) {
      delete vents[id];
    },
    trigger: function () {
      var args = Array.prototype.slice.call(arguments);
      var id = args.shift();
      if (vents[id]) {
        _.each(vents[id], function (cb) {
          cb.apply(null, args);
        });
      }
    }
  };
});
