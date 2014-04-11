define(function (require) {
  var app = require('modules').get('app/visualize');

  require('./_saved_vis');

  app.service('savedVisualizations', function (es, courier, $q, $timeout, SavedVis) {
    this.get = function (type, id) {
      return (new SavedVis(type, id)).init();
    };
  });
});