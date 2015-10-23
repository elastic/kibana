var $ = require('jquery');
var d3 = require('d3');
var callEach = require('lodash').callEach;
var bindKey = require('lodash').bindKey;
var rest = require('lodash').rest;

function Binder($scope) {
  this.disposal = [];
  if ($scope) {
    $scope.$on('$destroy', bindKey(this, 'destroy'));
  }
}

Binder.prototype.jqOn = function (el/*, ...args */) {
  var $el = $(el);
  var args = rest(arguments);
  $el.on.apply($el, args);
  this.disposal.push(function () {
    $el.off.apply($el, args);
    $el = null;
  });
};

Binder.prototype.fakeD3Bind = function (el, event, handler) {
  this.jqOn(el, event, function (e) {
    // mimick https://github.com/mbostock/d3/blob/3abb00113662463e5c19eb87cd33f6d0ddc23bc0/src/selection/on.js#L87-L94
    var o = d3.event; // Events can be reentrant (e.g., focus).
    d3.event = e;
    try {
      handler.apply(this, [this.__data__]);
    } finally {
      d3.event = o;
    }
  });
};

Binder.prototype.destroy = function () {
  callEach(this.disposal.slice(0));
};

module.exports = Binder;
