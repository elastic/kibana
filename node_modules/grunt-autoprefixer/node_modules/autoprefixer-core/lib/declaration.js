(function() {
  var Browsers, Declaration, Prefixer, utils, vendor,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Prefixer = require('./prefixer');

  Browsers = require('./browsers');

  vendor = require('postcss/lib/vendor');

  utils = require('./utils');

  Declaration = (function(_super) {
    __extends(Declaration, _super);

    function Declaration() {
      return Declaration.__super__.constructor.apply(this, arguments);
    }

    Declaration.prototype.check = function(decl) {
      return true;
    };

    Declaration.prototype.prefixed = function(prop, prefix) {
      return prefix + prop;
    };

    Declaration.prototype.normalize = function(prop) {
      return prop;
    };

    Declaration.prototype.otherPrefixes = function(value, prefix) {
      var other, _i, _len, _ref;
      _ref = Browsers.prefixes();
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        other = _ref[_i];
        if (other === prefix) {
          continue;
        }
        if (value.indexOf(other) !== -1) {
          return true;
        }
      }
      return false;
    };

    Declaration.prototype.set = function(decl, prefix) {
      decl.prop = this.prefixed(decl.prop, prefix);
      return decl;
    };

    Declaration.prototype.needCascade = function(decl) {
      return decl._autoprefixerCascade || (decl._autoprefixerCascade = this.all.options.cascade !== false && decl.before.indexOf("\n") !== -1);
    };

    Declaration.prototype.maxPrefixed = function(prefixes, decl) {
      var max, prefix, _i, _len;
      if (decl._autoprefixerMax) {
        return decl._autoprefixerMax;
      }
      max = 0;
      for (_i = 0, _len = prefixes.length; _i < _len; _i++) {
        prefix = prefixes[_i];
        prefix = utils.removeNote(prefix);
        if (prefix.length > max) {
          max = prefix.length;
        }
      }
      return decl._autoprefixerMax = max;
    };

    Declaration.prototype.calcBefore = function(prefixes, decl, prefix) {
      var before, diff, i, max, _i;
      if (prefix == null) {
        prefix = '';
      }
      before = decl.before;
      max = this.maxPrefixed(prefixes, decl);
      diff = max - utils.removeNote(prefix).length;
      for (i = _i = 0; 0 <= diff ? _i < diff : _i > diff; i = 0 <= diff ? ++_i : --_i) {
        before += ' ';
      }
      return before;
    };

    Declaration.prototype.restoreBefore = function(decl) {
      var lines, min;
      lines = decl.before.split("\n");
      min = lines[lines.length - 1];
      this.all.group(decl).up(function(prefixed) {
        var array, last;
        array = prefixed.before.split("\n");
        last = array[array.length - 1];
        if (last.length < min.length) {
          return min = last;
        }
      });
      lines[lines.length - 1] = min;
      return decl.before = lines.join("\n");
    };

    Declaration.prototype.insert = function(decl, prefix, prefixes) {
      var cloned;
      cloned = this.set(this.clone(decl), prefix);
      if (!cloned) {
        return;
      }
      if (this.needCascade(decl)) {
        cloned.before = this.calcBefore(prefixes, decl, prefix);
      }
      return decl.parent.insertBefore(decl, cloned);
    };

    Declaration.prototype.add = function(decl, prefix, prefixes) {
      var already, prefixed;
      prefixed = this.prefixed(decl.prop, prefix);
      already = this.all.group(decl).up(function(i) {
        return i.prop === prefixed;
      });
      already || (already = this.all.group(decl).down(function(i) {
        return i.prop === prefixed;
      }));
      if (already || this.otherPrefixes(decl.value, prefix)) {
        return;
      }
      return this.insert(decl, prefix, prefixes);
    };

    Declaration.prototype.process = function(decl) {
      var prefixes;
      if (this.needCascade(decl)) {
        prefixes = Declaration.__super__.process.apply(this, arguments);
        if (prefixes != null ? prefixes.length : void 0) {
          this.restoreBefore(decl);
          return decl.before = this.calcBefore(prefixes, decl);
        }
      } else {
        return Declaration.__super__.process.apply(this, arguments);
      }
    };

    Declaration.prototype.old = function(prop, prefix) {
      return [this.prefixed(prop, prefix)];
    };

    return Declaration;

  })(Prefixer);

  module.exports = Declaration;

}).call(this);
