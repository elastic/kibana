/* @notice
 *
 * Pretty handling of logarithmic axes.
 * Copyright (c) 2007-2014 IOLA and Ole Laursen.
 * Licensed under the MIT license.
 * Created by Arne de Laat
 * Set axis.mode to "log" and make the axis logarithmic using transform:
 *     axis: {
 *         mode: 'log',
 *         transform: function(v) {v <= 0 ? Math.log(v) / Math.LN10 : null},
 *         inverseTransform: function(v) {Math.pow(10, v)}
 *     }
 * The transform filters negative and zero values, because those are
 * invalid on logarithmic scales.
 * This plugin tries to create good looking logarithmic ticks, using
 * unicode superscript characters. If all data to be plotted is between two
 * powers of ten then the default flot tick generator and renderer are
 * used. Logarithmic ticks are places at powers of ten and at half those
 * values if there are not to many ticks already (e.g. [1, 5, 10, 50, 100]).
 * For details,  see https://github.com/flot/flot/pull/1328
*/

(function($) {

  function log10(value) {
    /* Get the Log10 of the value
    */
    return Math.log(value) / Math.LN10;
  }

  function floorAsLog10(value) {
    /* Get power of the first power of 10 below the value
    */
    return Math.floor(log10(value));
  }

  function ceilAsLog10(value) {
    /* Get power of the first power of 10 above the value
    */
    return Math.ceil(log10(value));
  }


  // round to nearby lower multiple of base
  function floorInBase(n, base) {
    return base * Math.floor(n / base);
  }

  function getUnicodePower(power) {
    var superscripts = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"],
      result = "",
      str_power = "" + power;
    for (var i = 0; i < str_power.length; i++) {
      if (str_power[i] === "+") {
      }
      else if (str_power[i] === "-") {
        result += "⁻";
      }
      else {
        result += superscripts[str_power[i]];
      }
    }
    return result;
  }

  function init(plot) {
    plot.hooks.processOptions.push(function (plot) {
      $.each(plot.getAxes(), function(axisName, axis) {

        var opts = axis.options;

        if (opts.mode === "log") {

          axis.tickGenerator = function (axis) {

            var ticks = [],
              end = ceilAsLog10(axis.max),
              start = floorAsLog10(axis.min),
              tick = Number.NaN,
              i = 0;

            if (axis.min === null || axis.min <= 0) {
              // Bad minimum, make ticks from 1 (10**0) to max
              start = 0;
              axis.min = 0.6;
            }

            if (end <= start) {
              // Start less than end?!
              ticks = [1e-6, 1e-5, 1e-4, 1e-3, 1e-2, 1e-1,
                1e0, 1e1, 1e2, 1e3, 1e4, 1e5, 1e6,
                1e7, 1e8, 1e9];
            }
            else if (log10(axis.max) - log10(axis.datamin) < 1) {
              // Default flot generator incase no powers of 10
              // are between start and end
              var prev;
              start = floorInBase(axis.min, axis.tickSize);
              do {
                prev = tick;
                tick = start + i * axis.tickSize;
                ticks.push(tick);
                ++i;
              } while (tick < axis.max && tick !== prev);
            }
            else {
              // Make ticks at each power of ten
              for (; i <= (end - start); i++) {
                tick = Math.pow(10, start + i);
                ticks.push(tick);
              }

              var length = ticks.length;

              // If not to many ticks also put a tick between
              // the powers of ten
              if (end - start < 6) {
                for (var j = 1; j < length * 2 - 1; j += 2) {
                  tick = ticks[j - 1] * 5;
                  ticks.splice(j, 0, tick);
                }
              }
            }
            return ticks;
          };

          axis.tickFormatter = function (value, axis) {
            var formatted;
            if (log10(axis.max) - log10(axis.datamin) < 1) {
              // Default flot formatter
              var factor = axis.tickDecimals ? Math.pow(10, axis.tickDecimals) : 1;
              formatted = "" + Math.round(value * factor) / factor;
              if (axis.tickDecimals !== null) {
                var decimal = formatted.indexOf(".");
                var precision = decimal === -1 ? 0 : formatted.length - decimal - 1;
                if (precision < axis.tickDecimals) {
                  return (precision ? formatted : formatted + ".") + ("" + factor).substr(1, axis.tickDecimals - precision);
                }
              }
            }
            else {
              var multiplier = "",
                exponential = parseFloat(value).toExponential(0),
                power = getUnicodePower(exponential.slice(2));
              if (exponential[0] !== "1") {
                multiplier = exponential[0] + "x";
              }
              formatted = multiplier + "10" + power;
            }
            return formatted;
          };
        }
      });
    });
  }

  $.plot.plugins.push({
    init: init,
    name: "log",
    version: "0.9"
  });

})(jQuery);
