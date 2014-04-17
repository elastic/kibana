define(function (require) {
  var _ = require('lodash');
  var moment = require('moment');

/* This is a simplified version of elasticsearch's date parser */
  var parse = function (text, roundUp) {
    if (!text) return undefined;
    if (moment.isMoment(text)) return text;
    if (_.isDate(text)) return moment(text);

    var time,
      mathString = '',
      index,
      parseString;
    if (text.substring(0, 3) === 'now') {
      time = moment();
      mathString = text.substring('now'.length);
    } else {
      index = text.indexOf('||');
      if (index === -1) {
        parseString = text;
        mathString = ''; // nothing else
      } else {
        parseString = text.substring(0, index);
        mathString = text.substring(index + 2);
      }
      // We're going to just require ISO8601 timestamps, k?
      time = moment(parseString);
    }

    if (!mathString.length) {
      return time;
    }

    return parseDateMath(mathString, time, roundUp);
  };

  var parseDateMath = function (mathString, time, roundUp) {
    var dateTime = time,
      spans = ['s', 'm', 'h', 'd', 'w', 'M', 'y'];

    for (var i = 0; i < mathString.length;) {
      var c = mathString.charAt(i++),
        type,
        num,
        unit;
      if (c === '/') {
        type = 0;
      } else if (c === '+') {
        type = 1;
      } else if (c === '-') {
        type = 2;
      } else {
        return undefined;
      }

      if (isNaN(mathString.charAt(i))) {
        num = 1;
      } else {
        var numFrom = i;
        while (!isNaN(mathString.charAt(i))) {
          i++;
        }
        num = parseInt(mathString.substring(numFrom, i), 10);
      }
      if (type === 0) {
        // rounding is only allowed on whole, single, units (eg M or 1M, not 0.5M or 2M)
        if (num !== 1) {
          return undefined;
        }
      }
      unit = mathString.charAt(i++);

      if (!_.contains(spans, unit)) {
        return undefined;
      } else {
        if (type === 0) {
          roundUp ? dateTime.endOf(unit) : dateTime.startOf(unit);
        } else if (type === 1) {
          dateTime.add(unit, num);
        } else if (type === 2) {
          dateTime.subtract(unit, num);
        }
      }
    }
    return dateTime;
  };

  return {
    parse: parse
  };
});