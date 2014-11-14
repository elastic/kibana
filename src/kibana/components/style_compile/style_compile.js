define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');

  require('modules')
  .get('kibana')
  .run(function ($rootScope, $compile, config) {
    var truncateGradientHeight = 15;
    var $style = $('<style>').appendTo('head');

    var template = _.template(require('text!components/style_compile/style_compile.css'));
    var locals = {};

    // watch the value of the truncate:maxHeight config param
    $rootScope.$watch(function () {
      return config.get('truncate:maxHeight');
    }, function (maxHeight) {
      if (maxHeight > 0) {
        locals.truncateMaxHeight = maxHeight + 'px !important';
        locals.truncateGradientTop = maxHeight - truncateGradientHeight + 'px';
      } else {
        locals.truncateMaxHeight = 'none';
        locals.truncateGradientTop = '-' + truncateGradientHeight + 'px';
      }

      $style.html(template(locals));
    });
  });
});