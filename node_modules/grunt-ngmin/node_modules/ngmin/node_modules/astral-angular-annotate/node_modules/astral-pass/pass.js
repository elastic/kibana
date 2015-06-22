
// TODO: investigate using falafel:
//       https://github.com/substack/node-falafel
//       or Rocambole:
//       https://github.com/millermedeiros/rocambole/

var deepCompare = require('./lib/deep-compare');
var deepApply = require('./lib/deep-apply');

var Pass = function () {
  this._matchers = [];
  this._do = function () {}; // noop

  this.prereqs = [];
};

Pass.prototype.run = function (ast, info) {
  var d = this._do;
  var name = this.name;

  info[name] = {};

  deepApply(ast, this._matchers, function (chunk) {
    info[name] = d(chunk, info);
  });

  return info[name];
};

Pass.prototype.when = function (matcher) {
  if (matcher instanceof Array) {
    matcher.forEach(function (m) {
      this.when(m);
    }, this);
    return this;
  }
  if (typeof matcher === 'function') {
    this._matchers.push(matcher);
    return this;
  }
  if (typeof matcher === 'object') {
    this._matchers.push(function (chunk) {
      return deepCompare(chunk, matcher);
    });
    return this;
  }
  throw new Error("Matcher expected to be an AST chunk object or a function");
};

Pass.prototype.do = function (fn) {
  this._do = fn;
};

module.exports = function () {
  return new Pass();
};
