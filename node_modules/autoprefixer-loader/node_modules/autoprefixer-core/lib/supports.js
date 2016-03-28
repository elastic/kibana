(function() {
  var Prefixes, Supports, Value, findCondition, findDecl, list, postcss, split, utils;

  Prefixes = require('./prefixes');

  Value = require('./value');

  utils = require('./utils');

  postcss = require('postcss');

  list = require('postcss/lib/list');

  split = /\(\s*([^\(\):]+)\s*:([^\)]+)/;

  findDecl = /\(\s*([^\(\):]+)\s*:\s*(.+)\s*\)/g;

  findCondition = /(not\s*)?\(\s*([^\(\):]+)\s*:\s*(.+?(?!\s*or\s*).+?)\s*\)*\s*\)\s*or\s*/gi;

  Supports = (function() {
    function Supports(all1) {
      this.all = all1;
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
      var decl, j, k, len, len1, prefixer, ref, ref1, rule;
      rule = this.virtual(prop, value);
      prefixer = this.all.add[prop];
      if (prefixer != null) {
        if (typeof prefixer.process === "function") {
          prefixer.process(rule.first);
        }
      }
      ref = rule.nodes;
      for (j = 0, len = ref.length; j < len; j++) {
        decl = ref[j];
        ref1 = this.all.values('add', prop);
        for (k = 0, len1 = ref1.length; k < len1; k++) {
          value = ref1[k];
          value.process(decl);
        }
        Value.save(this.all, decl);
      }
      return rule.nodes;
    };

    Supports.prototype.clean = function(params) {
      return params.replace(findCondition, (function(_this) {
        return function(all) {
          var _, check, checker, j, len, prop, ref, ref1, ref2, unprefixed, value;
          if (all.slice(0, 3).toLowerCase() === 'not') {
            return all;
          }
          ref = all.match(split), _ = ref[0], prop = ref[1], value = ref[2];
          unprefixed = _this.all.unprefixed(prop);
          if ((ref1 = _this.all.cleaner().remove[prop]) != null ? ref1.remove : void 0) {
            check = new RegExp('(\\(|\\s)' + utils.escapeRegexp(unprefixed) + ':');
            if (check.test(params)) {
              return '';
            }
          }
          ref2 = _this.all.cleaner().values('remove', unprefixed);
          for (j = 0, len = ref2.length; j < len; j++) {
            checker = ref2[j];
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
            var j, len, ref, results;
            ref = this.prefixed(prop, value);
            results = [];
            for (j = 0, len = ref.length; j < len; j++) {
              i = ref[j];
              results.push("(" + i.prop + ": " + i.value + ")");
            }
            return results;
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
