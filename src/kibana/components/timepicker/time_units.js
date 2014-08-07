define(function (require) {
  var module = require('modules').get('kibana');

  module.constant('timeUnits', {
    s: 'second',
    m: 'minute',
    h: 'hour',
    d: 'day',
    w: 'week',
    M: 'month',
    y: 'year'
  });

});