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

Binder.prototype._bind = function (on, off, emitter, args) {
  on.apply(emitter, args);
  this.disposal.push(function () {
    off.apply(emitter, args);
  });
};

Binder.prototype.on = function (emitter/*, ...args */) {
  this._bind(emitter.on, emitter.off || emitter.removeListener, emitter, rest(arguments));
};

Binder.prototype.jqOn = function (el/*, ...args */) {
  var $el = $(el);
  this._bind($el.on, $el.off, $el, rest(arguments));
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
  var destroyers = this.disposal;
  this.disposal = [];
  callEach(destroyers);
};

module.exports = Binder;
