// Shorts dot notated strings
// eg: foo.bar.baz becomes f.b.baz
// 'foo.bar.baz'.replace(/(.+?\.)/g,function(v) {return v[0]+'.';});
define(function (require) {
  var _ = require('lodash');
  require('modules')
    .get('kibana')
    .filter('shortDots', function (config) {
      return function (str) {
        if (!_.isString(str) || config.get('shortDots:enable') !== true) {
          return str;
        }
        return str.replace(/(.+?\.)/g, function (v) { return v[0] + '.'; });
      };
    });
});