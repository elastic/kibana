(function() {
  var OldSelector;

  OldSelector = (function() {
    function OldSelector(selector, prefix) {
      var _i, _len, _ref;
      this.prefix = prefix;
      this.prefixed = selector.prefixed(this.prefix);
      this.regexp = selector.regexp(this.prefix);
      this.prefixeds = [];
      _ref = selector.possible();
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        prefix = _ref[_i];
        this.prefixeds.push([selector.prefixed(prefix), selector.regexp(prefix)]);
      }
      this.unprefixed = selector.name;
      this.nameRegexp = selector.regexp();
    }

    OldSelector.prototype.isHack = function(rule) {
      var before, index, regexp, rules, some, string, _i, _len, _ref, _ref1;
      index = rule.parent.index(rule) + 1;
      rules = rule.parent.rules;
      while (index < rules.length) {
        before = rules[index].selector;
        if (!before) {
          return true;
        }
        if (before.indexOf(this.unprefixed) !== -1 && before.match(this.nameRegexp)) {
          return false;
        }
        some = false;
        _ref = this.prefixeds;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          _ref1 = _ref[_i], string = _ref1[0], regexp = _ref1[1];
          if (before.indexOf(string) !== -1 && before.match(regexp)) {
            some = true;
            break;
          }
        }
        if (!some) {
          return true;
        }
        index += 1;
      }
      return true;
    };

    OldSelector.prototype.check = function(rule) {
      if (rule.selector.indexOf(this.prefixed) === -1) {
        return false;
      }
      if (!rule.selector.match(this.regexp)) {
        return false;
      }
      if (this.isHack(rule)) {
        return false;
      }
      return true;
    };

    return OldSelector;

  })();

  module.exports = OldSelector;

}).call(this);
