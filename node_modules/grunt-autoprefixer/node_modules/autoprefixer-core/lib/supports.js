(function() {
  var Prefixes, Supports, Value, findCondition, findDecl, list, postcss, split, utils;

  Prefixes = require('./prefixes');

  Value = require('./value');

  utils = require('./utils');

  postcss = require('postcss');

  list = require('postcss/lib/list');

  split = /\(\s*([^\(\):]+)\s*:([^\)]+)/;

  findDecl = /\(\s*([^\(\):]+)\s*:\s*([^\)]+)\s*\)/g;

  findCondition = /(not\s*)?\(\s*([^\(\):]+)\s*:\s*([^\)]+)\s*\)\s*or\s*/gi;

  Supports = (function() {
    function Supports(all) {
      this.all = all;
    }

    Supports.prototype.virtual = function(prop, value) {
      var rule;
      rule = postcss.parse('a{}').first;
      rule.append({
        prop: prop,
        value: value,
        before: ''
      });
      return rule;
    };

    Supports.prototype.prefixed = function(prop, value) {
      var decl, prefixer, rule, _i, _j, _len, _len1, _ref, _ref1;
      rule = this.virtual(prop, value);
      prefixer = this.all.add[prop];
      if (prefixer != null) {
        if (typeof prefixer.process === "function") {
          prefixer.process(rule.first);
        }
      }
      _ref = rule.decls;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        decl = _ref[_i];
        _ref1 = this.all.values('add', prop);
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          value = _ref1[_j];
          value.process(decl);
        }
        Value.save(this.all, decl);
      }
      return rule.decls;
    };

    Supports.prototype.clean = function(params) {
      return params.replace(findCondition, (function(_this) {
        return function(all) {
          var check, checker, prop, unprefixed, value, _, _i, _len, _ref, _ref1, _ref2;
          if (all.slice(0, 3).toLowerCase() === 'not') {
            return all;
          }
          _ref = all.match(split), _ = _ref[0], prop = _ref[1], value = _ref[2];
          unprefixed = _this.all.unprefixed(prop);
          if ((_ref1 = _this.all.cleaner().remove[prop]) != null ? _ref1.remove : void 0) {
            check = new RegExp('(\\(|\\s)' + utils.escapeRegexp(unprefixed) + ':');
            if (check.test(params)) {
              return '';
            }
          }
          _ref2 = _this.all.cleaner().values('remove', unprefixed);
          for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
            checker = _ref2[_i];
            if (checker.check(value)) {
              return '';
            }
          }
          return all;
        };
      })(this)).replace(/\(\s*\((.*)\)\s*\)/g, '($1)');
    };

    Supports.prototype.process = function(rule) {
      rule.params = this.clean(rule.params);
      return rule.params = rule.params.replace(findDecl, (function(_this) {
        return function(all, prop, value) {
          var i, stringed;
          stringed = (function() {
            var _i, _len, _ref, _results;
            _ref = this.prefixed(prop, value);
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              i = _ref[_i];
              _results.push("(" + i.prop + ": " + i.value + ")");
            }
            return _results;
          }).call(_this);
          if (stringed.length === 1) {
            return stringed[0];
          } else {
            return '(' + stringed.join(' or ') + ')';
          }
        };
      })(this));
    };

    return Supports;

  })();

  module.exports = Supports;

}).call(this);
