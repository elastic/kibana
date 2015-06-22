
var clone = require('clone');

var Astral = function () {
  this._passes = {};
  this._info = {};
};

Astral.prototype.register = function (pass) {
  if (!pass.name) {
    throw new Error("Expected '" + pass.name + "' pass to have a name");
  }
  if (!pass.run) {
    throw new Error("Expected '" + pass.name + "' pass to have a 'run' method");
  }
  if (!pass.prereqs || !(pass.prereqs instanceof Array)) {
    throw new Error("Expected '" + pass.name + "' pass to have a 'prereqs' Array");
  }
  this._passes[pass.name] = pass;
};

// modifies the original AST
Astral.prototype.run = function (ast) {

  this._order().forEach(function (pass) {
    this._info[pass.name] = pass.run(ast, clone(this._info));
  }, this);

  return ast;
};


// returns the passes in order based on prereqs
Astral.prototype._order = function (ast) {

  var passes = this._passes;

  var order = [];

  var toOrder = Object.keys(passes).map(function (name) {
    return passes[name];
  }, this);

  var progress = false;

  do {
    var add = toOrder.filter(function (pass) {
      return !pass.prereqs.
        map(function (prereq) {
          return passes[prereq];
        }).
        filter(function (prereq) {
          return prereq;
        }).
        some(function (prereq) {
          return order.indexOf(prereq) === -1;
        });
    });
    if (add.length > 0) {
      progress = true;
      
      order = order.concat(add);
      add.forEach(function (a) {
        toOrder.splice(toOrder.indexOf(a), 1);
      });
    }
  } while (toOrder.length > 0 && progress);


  if (toOrder > 0) {
    return new Error("Unable to order " + toOrder.toString());
  }

  return order;
};

module.exports = function () {
  return new Astral();
};
