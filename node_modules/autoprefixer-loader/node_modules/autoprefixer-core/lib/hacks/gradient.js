(function() {
  var Gradient, OldValue, Value, isDirection, list, utils,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  OldValue = require('../old-value');

  Value = require('../value');

  utils = require('../utils');

  list = require('postcss/lib/list');

  isDirection = /top|left|right|bottom/gi;

  Gradient = (function(superClass) {
    extend(Gradient, superClass);

    function Gradient() {
      return Gradient.__super__.constructor.apply(this, arguments);
    }

    Gradient.names = ['linear-gradient', 'repeating-linear-gradient', 'radial-gradient', 'repeating-radial-gradient'];

    Gradient.prototype.replace = function(string, prefix) {
      return list.space(string).map((function(_this) {
        return function(value) {
          var after, args, close, params;
          if (value.slice(0, +_this.name.length + 1 || 9e9) !== _this.name + '(') {
            return value;
          }
          close = value.lastIndexOf(')');
          after = value.slice(close + 1);
          args = value.slice(_this.name.length + 1, +(close - 1) + 1 || 9e9);
          params = list.comma(args);
          params = _this.newDirection(params);
          if (prefix === '-webkit- old') {
            return _this.oldWebkit(value, args, params, after);
          } else {
            _this.convertDirection(params);
            return prefix + _this.name + '(' + params.join(', ') + ')' + after;
          }
        };
      })(this)).join(' ');
    };

    Gradient.prototype.directions = {
      top: 'bottom',
      left: 'right',
      bottom: 'top',
      right: 'left'
    };

    Gradient.prototype.oldDirections = {
      'top': 'left bottom, left top',
      'left': 'right top, left top',
      'bottom': 'left top, left bottom',
      'right': 'left top, right top',
      'top right': 'left bottom, right top',
      'top left': 'right bottom, left top',
      'right top': 'left bottom, right top',
      'right bottom': 'left top, right bottom',
      'bottom right': 'left top, right bottom',
      'bottom left': 'right top, left bottom',
      'left top': 'right bottom, left top',
      'left bottom': 'right top, left bottom'
    };

    Gradient.prototype.newDirection = function(params) {
      var first, value;
      first = params[0];
      if (first.indexOf('to ') === -1 && isDirection.test(first)) {
        first = first.split(' ');
        first = (function() {
          var j, len, results;
          results = [];
          for (j = 0, len = first.length; j < len; j++) {
            value = first[j];
            results.push(this.directions[value.toLowerCase()] || value);
          }
          return results;
        }).call(this);
        params[0] = 'to ' + first.join(' ');
      }
      return params;
    };

    Gradient.prototype.oldWebkit = function(value, args, params, after) {
      if (args.indexOf('px') !== -1) {
        return value;
      }
      if (this.name !== 'linear-gradient') {
        return value;
      }
      if (params[0] && params[0].indexOf('deg') !== -1) {
        return value;
      }
      if (args.indexOf('-corner') !== -1) {
        return value;
      }
      if (args.indexOf('-side') !== -1) {
        return value;
      }
      params = this.oldDirection(params);
      params = this.colorStops(params);
      return '-webkit-gradient(linear, ' + params.join(', ') + ')' + after;
    };

    Gradient.prototype.convertDirection = function(params) {
      if (params.length > 0) {
        if (params[0].slice(0, 3) === 'to ') {
          return params[0] = this.fixDirection(params[0]);
        } else if (params[0].indexOf('deg') !== -1) {
          return params[0] = this.fixAngle(params[0]);
        } else if (params[0].indexOf(' at ') !== -1) {
          return this.fixRadial(params);
        }
      }
    };

    Gradient.prototype.fixDirection = function(param) {
      var value;
      param = param.split(' ');
      param.splice(0, 1);
      param = (function() {
        var j, len, results;
        results = [];
        for (j = 0, len = param.length; j < len; j++) {
          value = param[j];
          results.push(this.directions[value.toLowerCase()] || value);
        }
        return results;
      }).call(this);
      return param.join(' ');
    };

    Gradient.prototype.roundFloat = function(float, digits) {
      return parseFloat(float.toFixed(digits));
    };

    Gradient.prototype.fixAngle = function(param) {
      param = parseFloat(param);
      param = Math.abs(450 - param) % 360;
      param = this.roundFloat(param, 3);
      return param + "deg";
    };

    Gradient.prototype.oldDirection = function(params) {
      var direction;
      if (params.length === 0) {
        params;
      }
      if (params[0].indexOf('to ') !== -1) {
        direction = params[0].replace(/^to\s+/, '');
        direction = this.oldDirections[direction];
        params[0] = direction;
        return params;
      } else {
        direction = this.oldDirections.bottom;
        return [direction].concat(params);
      }
    };

    Gradient.prototype.colorStops = function(params) {
      return params.map(function(param, i) {
        var color, match, position, ref;
        if (i === 0) {
          return param;
        }
        ref = list.space(param), color = ref[0], position = ref[1];
        if (position == null) {
          match = param.match(/^(.*\))(\d.*)$/);
          if (match) {
            color = match[1];
            position = match[2];
          }
        }
        if (position && position.indexOf(')') !== -1) {
          color += ' ' + position;
          position = void 0;
        }
        if (i === 1 && (position === void 0 || position === '0%')) {
          return "from(" + color + ")";
        } else if (i === params.length - 1 && (position === void 0 || position === '100%')) {
          return "to(" + color + ")";
        } else if (position) {
          return "color-stop(" + position + ", " + color + ")";
        } else {
          return "color-stop(" + color + ")";
        }
      });
    };

    Gradient.prototype.fixRadial = function(params) {
      var first;
      first = params[0].split(/\s+at\s+/);
      return params.splice(0, 1, first[1], first[0]);
    };

    Gradient.prototype.old = function(prefix) {
      var regexp, string, type;
      if (prefix === '-webkit-') {
        type = this.name === 'linear-gradient' ? 'linear' : 'radial';
        string = '-gradient';
        regexp = utils.regexp("-webkit-(" + type + "-gradient|gradient\\(\\s*" + type + ")", false);
        return new OldValue(this.name, prefix + this.name, string, regexp);
      } else {
        return Gradient.__super__.old.apply(this, arguments);
      }
    };

    Gradient.prototype.add = function(decl, prefix) {
      var p;
      p = decl.prop;
      if (p.indexOf('mask') !== -1) {
        if (prefix === '-webkit-' || prefix === '-webkit- old') {
          return Gradient.__super__.add.apply(this, arguments);
        }
      } else if (p === 'list-style' || p === 'list-style-image' || p === 'content') {
        if (prefix === '-webkit-' || prefix === '-webkit- old') {
          return Gradient.__super__.add.apply(this, arguments);
        }
      } else {
        return Gradient.__super__.add.apply(this, arguments);
      }
    };

    Gradient.prototype.process = function(node, result) {
      var added;
      added = Gradient.__super__.process.apply(this, arguments);
      if (added && this.name === 'linear-gradient') {
        if (/\(\s*(top|left|right|bottom)/.test(node.value)) {
          result.warn('Gradient has outdated direction syntax. ' + 'New syntax is like "to left" instead of "right".', {
            node: node
          });
        }
      }
      return added;
    };

    return Gradient;

  })(Value);

  module.exports = Gradient;

}).call(this);
