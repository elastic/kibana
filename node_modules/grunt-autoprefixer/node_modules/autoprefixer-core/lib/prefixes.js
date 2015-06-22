(function() {
  var Browsers, Declaration, Keyframes, Prefixes, Processor, Selector, Supports, Value, declsCache, utils, vendor;

  utils = require('./utils');

  vendor = require('postcss/lib/vendor');

  Declaration = require('./declaration');

  Processor = require('./processor');

  Keyframes = require('./keyframes');

  Supports = require('./supports');

  Browsers = require('./browsers');

  Selector = require('./selector');

  Value = require('./value');

  Selector.hack(require('./hacks/fullscreen'));

  Selector.hack(require('./hacks/placeholder'));

  Declaration.hack(require('./hacks/flex'));

  Declaration.hack(require('./hacks/order'));

  Declaration.hack(require('./hacks/filter'));

  Declaration.hack(require('./hacks/flex-flow'));

  Declaration.hack(require('./hacks/flex-grow'));

  Declaration.hack(require('./hacks/flex-wrap'));

  Declaration.hack(require('./hacks/align-self'));

  Declaration.hack(require('./hacks/flex-basis'));

  Declaration.hack(require('./hacks/align-items'));

  Declaration.hack(require('./hacks/flex-shrink'));

  Declaration.hack(require('./hacks/break-inside'));

  Declaration.hack(require('./hacks/border-image'));

  Declaration.hack(require('./hacks/align-content'));

  Declaration.hack(require('./hacks/border-radius'));

  Declaration.hack(require('./hacks/transform-decl'));

  Declaration.hack(require('./hacks/flex-direction'));

  Declaration.hack(require('./hacks/justify-content'));

  Declaration.hack(require('./hacks/background-size'));

  Value.hack(require('./hacks/gradient'));

  Value.hack(require('./hacks/transition'));

  Value.hack(require('./hacks/display-flex'));

  Value.hack(require('./hacks/filter-value'));

  Value.hack(require('./hacks/fill-available'));

  Value.hack(require('./hacks/transform-value'));

  declsCache = {};

  Prefixes = (function() {
    function Prefixes(data, browsers, options) {
      var _ref;
      this.data = data;
      this.browsers = browsers;
      this.options = options != null ? options : {};
      _ref = this.preprocess(this.select(this.data)), this.add = _ref[0], this.remove = _ref[1];
      this.processor = new Processor(this);
    }

    Prefixes.prototype.transitionProps = ['transition', 'transition-property'];

    Prefixes.prototype.cleaner = function() {
      var empty;
      if (!this.cleanerCache) {
        if (this.browsers.selected.length) {
          empty = new Browsers(this.browsers.data, []);
          this.cleanerCache = new Prefixes(this.data, empty, this.options);
        } else {
          return this;
        }
      }
      return this.cleanerCache;
    };

    Prefixes.prototype.select = function(list) {
      var add, all, data, name, notes, selected;
      selected = {
        add: {},
        remove: {}
      };
      for (name in list) {
        data = list[name];
        add = data.browsers.map(function(i) {
          var params;
          params = i.split(' ');
          return {
            browser: params[0] + ' ' + params[1],
            note: params[2]
          };
        });
        notes = add.filter(function(i) {
          return i.note;
        }).map((function(_this) {
          return function(i) {
            return _this.browsers.prefix(i.browser) + ' ' + i.note;
          };
        })(this));
        notes = utils.uniq(notes);
        add = add.filter((function(_this) {
          return function(i) {
            return _this.browsers.isSelected(i.browser);
          };
        })(this)).map((function(_this) {
          return function(i) {
            var prefix;
            prefix = _this.browsers.prefix(i.browser);
            if (i.note) {
              return prefix + ' ' + i.note;
            } else {
              return prefix;
            }
          };
        })(this));
        add = this.sort(utils.uniq(add));
        all = data.browsers.map((function(_this) {
          return function(i) {
            return _this.browsers.prefix(i);
          };
        })(this));
        if (data.mistakes) {
          all = all.concat(data.mistakes);
        }
        all = all.concat(notes);
        all = utils.uniq(all);
        if (add.length) {
          selected.add[name] = add;
          if (add.length < all.length) {
            selected.remove[name] = all.filter(function(i) {
              return add.indexOf(i) === -1;
            });
          }
        } else {
          selected.remove[name] = all;
        }
      }
      return selected;
    };

    Prefixes.prototype.sort = function(prefixes) {
      return prefixes.sort(function(a, b) {
        var aLength, bLength;
        aLength = utils.removeNote(a).length;
        bLength = utils.removeNote(b).length;
        if (aLength === bLength) {
          return b.length - a.length;
        } else {
          return bLength - aLength;
        }
      });
    };

    Prefixes.prototype.preprocess = function(selected) {
      var add, name, old, olds, prefix, prefixed, prefixes, prop, props, remove, selector, value, values, _i, _j, _k, _l, _len, _len1, _len2, _len3, _len4, _len5, _len6, _m, _n, _o, _ref, _ref1, _ref2;
      add = {
        selectors: [],
        '@supports': new Supports(this)
      };
      _ref = selected.add;
      for (name in _ref) {
        prefixes = _ref[name];
        if (name === '@keyframes') {
          add[name] = new Keyframes(name, prefixes, this);
        } else if (this.data[name].selector) {
          add.selectors.push(Selector.load(name, prefixes, this));
        } else {
          props = this.data[name].transition ? this.transitionProps : this.data[name].props;
          if (props) {
            value = Value.load(name, prefixes, this);
            for (_i = 0, _len = props.length; _i < _len; _i++) {
              prop = props[_i];
              if (!add[prop]) {
                add[prop] = {
                  values: []
                };
              }
              add[prop].values.push(value);
            }
          }
          if (!this.data[name].props) {
            values = ((_ref1 = add[name]) != null ? _ref1.values : void 0) || [];
            add[name] = Declaration.load(name, prefixes, this);
            add[name].values = values;
          }
        }
      }
      remove = {
        selectors: []
      };
      _ref2 = selected.remove;
      for (name in _ref2) {
        prefixes = _ref2[name];
        if (this.data[name].selector) {
          selector = Selector.load(name, prefixes);
          for (_j = 0, _len1 = prefixes.length; _j < _len1; _j++) {
            prefix = prefixes[_j];
            remove.selectors.push(selector.old(prefix));
          }
        } else if (name[0] === '@') {
          for (_k = 0, _len2 = prefixes.length; _k < _len2; _k++) {
            prefix = prefixes[_k];
            prefixed = '@' + prefix + name.slice(1);
            remove[prefixed] = {
              remove: true
            };
          }
        } else {
          props = this.data[name].transition ? this.transitionProps : this.data[name].props;
          if (props) {
            value = Value.load(name, [], this);
            for (_l = 0, _len3 = prefixes.length; _l < _len3; _l++) {
              prefix = prefixes[_l];
              old = value.old(prefix);
              if (old) {
                for (_m = 0, _len4 = props.length; _m < _len4; _m++) {
                  prop = props[_m];
                  if (!remove[prop]) {
                    remove[prop] = {};
                  }
                  if (!remove[prop].values) {
                    remove[prop].values = [];
                  }
                  remove[prop].values.push(old);
                }
              }
            }
          }
          if (!this.data[name].props) {
            for (_n = 0, _len5 = prefixes.length; _n < _len5; _n++) {
              prefix = prefixes[_n];
              prop = vendor.unprefixed(name);
              olds = this.decl(name).old(name, prefix);
              for (_o = 0, _len6 = olds.length; _o < _len6; _o++) {
                prefixed = olds[_o];
                if (!remove[prefixed]) {
                  remove[prefixed] = {};
                }
                remove[prefixed].remove = true;
              }
            }
          }
        }
      }
      return [add, remove];
    };

    Prefixes.prototype.decl = function(prop) {
      var decl;
      decl = declsCache[prop];
      if (decl) {
        return decl;
      } else {
        return declsCache[prop] = Declaration.load(prop);
      }
    };

    Prefixes.prototype.unprefixed = function(prop) {
      prop = vendor.unprefixed(prop);
      return this.decl(prop).normalize(prop);
    };

    Prefixes.prototype.prefixed = function(prop, prefix) {
      prop = vendor.unprefixed(prop);
      return this.decl(prop).prefixed(prop, prefix);
    };

    Prefixes.prototype.values = function(type, prop) {
      var data, global, values, _ref, _ref1;
      data = this[type];
      global = (_ref = data['*']) != null ? _ref.values : void 0;
      values = (_ref1 = data[prop]) != null ? _ref1.values : void 0;
      if (global && values) {
        return utils.uniq(global.concat(values));
      } else {
        return global || values || [];
      }
    };

    Prefixes.prototype.group = function(decl) {
      var checker, index, length, rule, unprefixed;
      rule = decl.parent;
      index = rule.index(decl);
      length = rule.decls.length;
      unprefixed = this.unprefixed(decl.prop);
      checker = (function(_this) {
        return function(step, callback) {
          var other;
          index += step;
          while (index >= 0 && index < length) {
            other = rule.decls[index];
            if (other.type === 'decl') {
              if (step === -1 && other.prop === unprefixed) {
                if (!Browsers.withPrefix(other.value)) {
                  break;
                }
              }
              if (_this.unprefixed(other.prop) !== unprefixed) {
                break;
              } else if (callback(other) === true) {
                return true;
              }
              if (step === +1 && other.prop === unprefixed) {
                if (!Browsers.withPrefix(other.value)) {
                  break;
                }
              }
            }
            index += step;
          }
          return false;
        };
      })(this);
      return {
        up: function(callback) {
          return checker(-1, callback);
        },
        down: function(callback) {
          return checker(+1, callback);
        }
      };
    };

    return Prefixes;

  })();

  module.exports = Prefixes;

}).call(this);
