/*jshint maxlen:false, white:false, -W116:false, quotmark:false, -W018:false, -W064:false, -W015:false */
(function() {
  var Set, Stochator, callFunctions, floatGenerator, integerGenerator, inverseNormalCumulativeDistribution, isType, randomBoundedFloat, randomBoundedInteger, randomCharacter, randomColor, randomNormallyDistributedFloat, randomSetMember, randomSetMemberWithoutReplacement, randomWeightedSetMember, setGenerator, shuffleSet,
    __indexOf = Array.prototype.indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    __slice = Array.prototype.slice;

  Set = (function() {

    function Set(values) {
      this.values = values;
      this.length = this.values.length;
    }

    Set.prototype.toString = function() {
      return "[object Set]";
    };

    Set.prototype.copy = function() {
      return this.values.slice(0, this.length);
    };

    Set.prototype.enumerate = function(depth) {
      var d, digits, e, enumeration, enumerations, enumerationsLength, i;
      if (depth == null) depth = this.length;
      enumerationsLength = Math.pow(this.length, depth);
      enumerations = [];
      for (enumeration = 0; 0 <= enumerationsLength ? enumeration < enumerationsLength : enumeration > enumerationsLength; 0 <= enumerationsLength ? enumeration++ : enumeration--) {
        e = enumeration;
        digits = [];
        for (i = 0; 0 <= depth ? i < depth : i > depth; 0 <= depth ? i++ : i--) {
          d = e % this.length;
          e -= d;
          e /= this.length;
          digits.push(this.values[d]);
        }
        enumerations.push(new Set(digits));
      }
      return new Set(enumerations);
    };

    Set.prototype.intersection = function(set) {
      var value;
      return new Set((function() {
        var _i, _len, _ref, _results;
        _ref = set.values;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          value = _ref[_i];
          if (__indexOf.call(this.values, value) >= 0) _results.push(value);
        }
        return _results;
      }).call(this));
    };

    Set.prototype.union = function(set) {
      return new Set(this.values.concat(this.difference(set).values));
    };

    Set.prototype.difference = function(set) {
      var value;
      return new Set((function() {
        var _i, _len, _ref, _results;
        _ref = set.values;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          value = _ref[_i];
          if (!(__indexOf.call(this.values, value) >= 0)) _results.push(value);
        }
        return _results;
      }).call(this));
    };

    Set.prototype.symmetricDifference = function(set) {
      return this.union(set).difference(this.intersection(set));
    };

    Set.prototype.reduce = function(iterator) {
      return this.values.reduce(iterator);
    };

    Set.prototype.reverse = function() {
      return new Set(this.copy().reverse());
    };

    Set.prototype.sort = function(compare) {
      return this.copy().sort(compare);
    };

    Set.prototype.sum = function() {
      var _ref;
      return (_ref = this._sum) != null ? _ref : this._sum = this.reduce(function(a, b) {
        return a + b;
      });
    };

    Set.prototype.mean = function() {
      var _ref;
      return (_ref = this._mean) != null ? _ref : this._mean = this.sum() / this.length;
    };

    Set.prototype.stdev = function() {
      var value, _ref;
      return (_ref = this._stdev) != null ? _ref : this._stdev = Math.sqrt(new Set((function() {
        var _i, _len, _ref2, _results;
        _ref2 = this.values;
        _results = [];
        for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
          value = _ref2[_i];
          _results.push(Math.pow(value - this.mean(), 2));
        }
        return _results;
      }).call(this)).mean());
    };

    Set.prototype.get = function(index, dflt) {
      if (this.values[index] != null) {
        return this.values[index];
      } else {
        return dflt;
      }
    };

    Set.prototype.each = function(iterator) {
      var index, value, _len, _ref, _results;
      _ref = this.values;
      _results = [];
      for (index = 0, _len = _ref.length; index < _len; index++) {
        value = _ref[index];
        _results.push(iterator(value, index));
      }
      return _results;
    };

    Set.prototype.map = function(iterator) {
      var index, value;
      return new Set((function() {
        var _len, _ref, _results;
        _ref = this.values;
        _results = [];
        for (index = 0, _len = _ref.length; index < _len; index++) {
          value = _ref[index];
          _results.push(iterator(value, index));
        }
        return _results;
      }).call(this));
    };

    Set.prototype.pop = function(index) {
      var value;
      if (index == null) index = this.length - 1;
      value = this.values[index];
      this.values.splice(index, 1);
      return value;
    };

    return Set;

  })();

  isType = function(type) {
    return function(arg) {
      return Object.prototype.toString.call(arg) === ("[object " + type + "]");
    };
  };

  callFunctions = function(fns) {
    var fn, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = fns.length; _i < _len; _i++) {
      fn = fns[_i];
      _results.push(fn());
    }
    return _results;
  };

  randomBoundedFloat = function(min, max) {
    var spread;
    if (min == null) min = 0;
    if (max == null) max = 1;
    spread = max - min;
    return Math.random() * spread + min;
  };

  randomBoundedInteger = function(min, max) {
    var spread;
    if (min == null) min = 0;
    if (max == null) max = 1;
    spread = 1 + max - min;
    return Math.floor(Math.random() * spread) + min;
  };

  randomColor = function() {
    var byte, mutator;
    byte = {
      kind: "integer",
      min: 0,
      max: 255
    };
    mutator = function(bytes) {
      var blue, green, red;
      red = bytes[0], green = bytes[1], blue = bytes[2];
      return {
        red: red,
        green: green,
        blue: blue
      };
    };
    return new Stochator(byte, byte, byte, mutator).next;
  };

  randomNormallyDistributedFloat = function(mean, stdev, min, max) {
    var float, seed;
    seed = randomBoundedFloat();
    float = inverseNormalCumulativeDistribution(seed) * stdev + mean;
    if ((min != null) && (max != null)) {
      return Math.min(max, Math.max(min, float));
    } else {
      return float;
    }
  };

  randomCharacter = function(lowercase) {
    var max, min, mutator, _ref;
    _ref = lowercase ? [97, 122] : [65, 90], min = _ref[0], max = _ref[1];
    mutator = function(charCode) {
      return String.fromCharCode(charCode);
    };
    return new Stochator({
      kind: "integer",
      min: min,
      max: max
    }, mutator).next;
  };

  randomSetMember = function(set) {
    var max;
    max = set.length - 1;
    return set.get(randomBoundedInteger(0, max));
  };

  randomSetMemberWithoutReplacement = function(set) {
    if (!set.get(0)) return;
    set.length -= 1;
    return set.pop(randomBoundedInteger(0, set.length));
  };

  randomWeightedSetMember = function(set, weights) {
    var float, member, weightSum, _ref;
    _ref = [void 0, 0, randomBoundedFloat()], member = _ref[0], weightSum = _ref[1], float = _ref[2];
    set.each(function(value, index) {
      var weight;
      if (member) return;
      weight = weights.get(index);
      if (float <= weightSum + weight && float >= weightSum) member = value;
      return weightSum += weight;
    });
    return member;
  };

  inverseNormalCumulativeDistribution = function(probability) {
    var base, coefficient, denomCoeffcients, denomMaxExponent, denominator, high, low, mapMaxExp, numCoefficients, numMaxExponent, numerator, _ref, _ref2;
    high = probability > 0.97575;
    low = probability < 0.02425;
    if (low || high) {
      numCoefficients = new Set([-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968]);
      denomCoeffcients = new Set([7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416]);
      _ref = [5, 4], numMaxExponent = _ref[0], denomMaxExponent = _ref[1];
      coefficient = low ? 1 : -1;
      base = Math.sqrt(-2 * Math.log(low ? probability : 1 - probability));
    } else {
      numCoefficients = new Set([-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239]);
      denomCoeffcients = new Set([-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1]);
      _ref2 = [5, 5], numMaxExponent = _ref2[0], denomMaxExponent = _ref2[1];
      coefficient = probability - 0.5;
      base = Math.pow(coefficient, 2);
    }
    mapMaxExp = function(maxExp) {
      return function(value, index) {
        return value * Math.pow(base, maxExp - index);
      };
    };
    numerator = numCoefficients.map(mapMaxExp(numMaxExponent)).sum();
    denominator = denomCoeffcients.map(mapMaxExp(denomMaxExponent)).sum() + 1;
    return coefficient * numerator / denominator;
  };

  shuffleSet = function(set) {
    var index, randomIndex, tmp, values, _ref;
    values = set.copy();
    for (index = _ref = values.length - 1; _ref <= 0 ? index < 0 : index > 0; _ref <= 0 ? index++ : index--) {
      randomIndex = randomBoundedInteger(0, index);
      tmp = values[index];
      values[index] = values[randomIndex];
      values[randomIndex] = tmp;
    }
    return values;
  };

  floatGenerator = function(min, max, mean, stdev) {
    if (mean && stdev) {
      return function() {
        return randomNormallyDistributedFloat(mean, stdev, min, max);
      };
    } else {
      return function() {
        return randomBoundedFloat(min, max);
      };
    }
  };

  integerGenerator = function(min, max) {
    if (min == null) min = 0;
    if (max == null) max = 1;
    return function() {
      return randomBoundedInteger(min, max);
    };
  };

  setGenerator = function(values, replacement, shuffle, weights) {
    var set, weightsSet;
    if (replacement == null) replacement = true;
    if (shuffle == null) shuffle = false;
    if (weights == null) weights = null;
    if (!values || !values.length) {
      throw Error("Must provide a 'values' array for a set generator.");
    }
    set = new Set(values);
    if (shuffle) {
      return function() {
        return shuffleSet(set);
      };
    } else if (replacement) {
      if (weights) {
        weightsSet = new Set(weights);
        return function() {
          return randomWeightedSetMember(set, weightsSet);
        };
      } else {
        return function() {
          return randomSetMember(set);
        };
      }
    } else {
      return function() {
        return randomSetMemberWithoutReplacement(set);
      };
    }
  };

  Stochator = (function() {
    var VERSION;

    VERSION = "0.3.1";

    function Stochator() {
      var configs;
      configs = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      this.setGenerator(configs);
    }

    Stochator.prototype.createGenerator = function(config) {
      var generator, max, mean, min, replacement, shuffle, stdev, values, weights;
      if (config.kind == null) config.kind = "float";
      generator = (function() {
        switch (config.kind) {
          case "float":
            min = config.min, max = config.max, mean = config.mean, stdev = config.stdev;
            return floatGenerator(min, max, mean, stdev);
          case "integer":
            return integerGenerator(config.min, config.max);
          case "set":
            values = config.values, replacement = config.replacement, shuffle = config.shuffle, weights = config.weights;
            return setGenerator(values, replacement, shuffle, weights);
          case "color":
          case "rgb":
            return randomColor(config.kind);
          case "a-z":
          case "A-Z":
            return randomCharacter(config.kind === "a-z");
        }
      })();
      if (!generator) {
        throw Error("" + config.kind + " not a recognized kind.");
      } else {
        return generator;
      }
    };

    Stochator.prototype.createGenerators = function(configs, mutator) {
      var callGenerators, caller, config, generators,
        _this = this;
      if (configs[0] == null) configs[0] = {};
      generators = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = configs.length; _i < _len; _i++) {
          config = configs[_i];
          _results.push(this.createGenerator(config));
        }
        return _results;
      }).call(this);
      if (!mutator) {
        callGenerators = generators.length === 1 ? function() {
          return callFunctions(generators)[0];
        } : function() {
          return callFunctions(generators);
        };
      } else {
        caller = generators.length === 1 ? function() {
          return callFunctions(generators)[0];
        } : function() {
          return callFunctions(generators);
        };
        callGenerators = function() {
          return _this.value = mutator.call(_this, caller(), _this.value);
        };
      }
      return function(times) {
        var time, _results;
        if (times) {
          _results = [];
          for (time = 1; 1 <= times ? time <= times : time >= times; 1 <= times ? time++ : time--) {
            _results.push(callGenerators());
          }
          return _results;
        } else {
          return callGenerators();
        }
      };
    };

    Stochator.prototype.setGenerator = function(configs) {
      var config, generatorConfigs, mutator, name, _i, _len, _ref, _ref2;
      generatorConfigs = [];
      for (_i = 0, _len = configs.length; _i < _len; _i++) {
        config = configs[_i];
        if (isType("Object")(config)) {
          generatorConfigs.push(config);
        } else {
          break;
        }
      }
      _ref = configs.slice(generatorConfigs.length), name = _ref[0], mutator = _ref[1];
      name || (name = "next");
      if (isType("Function")(name)) {
        _ref2 = ["next", name], name = _ref2[0], mutator = _ref2[1];
      }
      return this[name] = this.createGenerators(generatorConfigs, mutator);
    };

    Stochator.prototype.toString = function() {
      return "[object Stochator]";
    };

    return Stochator;

  })();

  if (typeof module !== "undefined" && module !== null ? module.exports : void 0) {
    module.exports = Stochator;
  } else {
    this.Stochator = Stochator;
  }

}).call(this);
