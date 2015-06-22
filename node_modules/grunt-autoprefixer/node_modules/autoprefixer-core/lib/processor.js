(function() {
  var Processor, Value, utils, vendor;

  vendor = require('postcss/lib/vendor');

  Value = require('./value');

  utils = require('./utils');

  Processor = (function() {
    function Processor(prefixes) {
      this.prefixes = prefixes;
    }

    Processor.prototype.add = function(css) {
      var keyframes, supports;
      keyframes = this.prefixes.add['@keyframes'];
      supports = this.prefixes.add['@supports'];
      css.eachAtRule((function(_this) {
        return function(rule) {
          if (rule.name === 'keyframes') {
            if (!_this.disabled(rule)) {
              return keyframes != null ? keyframes.process(rule) : void 0;
            }
          } else if (rule.name === 'supports') {
            if (!_this.disabled(rule)) {
              return supports.process(rule);
            }
          }
        };
      })(this));
      css.eachRule((function(_this) {
        return function(rule) {
          var selector, _i, _len, _ref, _results;
          if (_this.disabled(rule)) {
            return;
          }
          _ref = _this.prefixes.add.selectors;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            selector = _ref[_i];
            _results.push(selector.process(rule));
          }
          return _results;
        };
      })(this));
      css.eachDecl((function(_this) {
        return function(decl) {
          var prefix;
          prefix = _this.prefixes.add[decl.prop];
          if (prefix && prefix.prefixes) {
            if (!_this.disabled(decl)) {
              return prefix.process(decl);
            }
          }
        };
      })(this));
      return css.eachDecl((function(_this) {
        return function(decl) {
          var unprefixed, value, _i, _len, _ref;
          if (_this.disabled(decl)) {
            return;
          }
          unprefixed = _this.prefixes.unprefixed(decl.prop);
          _ref = _this.prefixes.values('add', unprefixed);
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            value = _ref[_i];
            value.process(decl);
          }
          return Value.save(_this.prefixes, decl);
        };
      })(this));
    };

    Processor.prototype.remove = function(css) {
      var checker, _i, _len, _ref;
      css.eachAtRule((function(_this) {
        return function(rule, i) {
          if (_this.prefixes.remove['@' + rule.name]) {
            if (!_this.disabled(rule)) {
              return rule.parent.remove(i);
            }
          }
        };
      })(this));
      _ref = this.prefixes.remove.selectors;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        checker = _ref[_i];
        css.eachRule((function(_this) {
          return function(rule, i) {
            if (checker.check(rule)) {
              if (!_this.disabled(rule)) {
                return rule.parent.remove(i);
              }
            }
          };
        })(this));
      }
      return css.eachDecl((function(_this) {
        return function(decl, i) {
          var notHack, rule, unprefixed, _j, _len1, _ref1, _ref2;
          if (_this.disabled(decl)) {
            return;
          }
          rule = decl.parent;
          unprefixed = _this.prefixes.unprefixed(decl.prop);
          if ((_ref1 = _this.prefixes.remove[decl.prop]) != null ? _ref1.remove : void 0) {
            notHack = _this.prefixes.group(decl).down(function(other) {
              return other.prop === unprefixed;
            });
            if (notHack) {
              if (decl.before.indexOf("\n") > -1) {
                _this.reduceSpaces(decl);
              }
              rule.remove(i);
              return;
            }
          }
          _ref2 = _this.prefixes.values('remove', unprefixed);
          for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
            checker = _ref2[_j];
            if (checker.check(decl.value)) {
              rule.remove(i);
              return;
            }
          }
        };
      })(this));
    };

    Processor.prototype.disabled = function(node) {
      var status;
      if (node._autoprefixerDisabled != null) {
        return node._autoprefixerDisabled;
      } else if (node.decls || node.rules) {
        status = void 0;
        node.each(function(i) {
          if (i.type !== 'comment') {
            return;
          }
          if (i.text === 'autoprefixer: off') {
            status = false;
            return false;
          } else if (i.text === 'autoprefixer: on') {
            status = true;
            return false;
          }
        });
        return node._autoprefixerDisabled = status != null ? !status : node.parent ? this.disabled(node.parent) : false;
      } else {
        return node._autoprefixerDisabled = this.disabled(node.parent);
      }
    };

    Processor.prototype.reduceSpaces = function(decl) {
      var diff, parts, prevMin, stop;
      stop = false;
      this.prefixes.group(decl).up(function(other) {
        return stop = true;
      });
      if (stop) {
        return;
      }
      parts = decl.before.split("\n");
      prevMin = parts[parts.length - 1].length;
      diff = false;
      return this.prefixes.group(decl).down(function(other) {
        var last;
        parts = other.before.split("\n");
        last = parts.length - 1;
        if (parts[last].length > prevMin) {
          if (diff === false) {
            diff = parts[last].length - prevMin;
          }
          parts[last] = parts[last].slice(0, -diff);
          return other.before = parts.join("\n");
        }
      });
    };

    return Processor;

  })();

  module.exports = Processor;

}).call(this);
