'use strict';

angular.module('mgcrea.ngStrap.helpers.dateParser', [])

.provider('$dateParser', function($localeProvider) {

  // define a custom ParseDate object to use instead of native Date
  // to avoid date values wrapping when setting date component values
  function ParseDate() {
    this.year = 1970;
    this.month = 0;
    this.day = 1;
    this.hours = 0;
    this.minutes = 0;
    this.seconds = 0;
    this.milliseconds = 0;
  }

  ParseDate.prototype.setMilliseconds = function(value) { this.milliseconds = value; };
  ParseDate.prototype.setSeconds = function(value) { this.seconds = value; };
  ParseDate.prototype.setMinutes = function(value) { this.minutes = value; };
  ParseDate.prototype.setHours = function(value) { this.hours = value; };
  ParseDate.prototype.getHours = function() { return this.hours; };
  ParseDate.prototype.setDate = function(value) { this.day = value; };
  ParseDate.prototype.setMonth = function(value) { this.month = value; };
  ParseDate.prototype.setFullYear = function(value) { this.year = value; };
  ParseDate.prototype.fromDate = function(value) {
    this.year = value.getFullYear();
    this.month = value.getMonth();
    this.day = value.getDate();
    this.hours = value.getHours();
    this.minutes = value.getMinutes();
    this.seconds = value.getSeconds();
    this.milliseconds = value.getMilliseconds();
    return this;
  };

  ParseDate.prototype.toDate = function() {
    return new Date(this.year, this.month, this.day, this.hours, this.minutes, this.seconds, this.milliseconds);
  };

  var proto = ParseDate.prototype;

  function noop() {
  }

  function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  }

  function indexOfCaseInsensitive(array, value) {
    var len = array.length, str=value.toString().toLowerCase();
    for (var i=0; i<len; i++) {
      if (array[i].toLowerCase() === str) { return i; }
    }
    return -1; // Return -1 per the "Array.indexOf()" method.
  }

  var defaults = this.defaults = {
    format: 'shortDate',
    strict: false
  };

  this.$get = function($locale, dateFilter) {

    var DateParserFactory = function(config) {

      var options = angular.extend({}, defaults, config);

      var $dateParser = {};

      var regExpMap = {
        'sss'   : '[0-9]{3}',
        'ss'    : '[0-5][0-9]',
        's'     : options.strict ? '[1-5]?[0-9]' : '[0-9]|[0-5][0-9]',
        'mm'    : '[0-5][0-9]',
        'm'     : options.strict ? '[1-5]?[0-9]' : '[0-9]|[0-5][0-9]',
        'HH'    : '[01][0-9]|2[0-3]',
        'H'     : options.strict ? '1?[0-9]|2[0-3]' : '[01]?[0-9]|2[0-3]',
        'hh'    : '[0][1-9]|[1][012]',
        'h'     : options.strict ? '[1-9]|1[012]' : '0?[1-9]|1[012]',
        'a'     : 'AM|PM',
        'EEEE'  : $locale.DATETIME_FORMATS.DAY.join('|'),
        'EEE'   : $locale.DATETIME_FORMATS.SHORTDAY.join('|'),
        'dd'    : '0[1-9]|[12][0-9]|3[01]',
        'd'     : options.strict ? '[1-9]|[1-2][0-9]|3[01]' : '0?[1-9]|[1-2][0-9]|3[01]',
        'MMMM'  : $locale.DATETIME_FORMATS.MONTH.join('|'),
        'MMM'   : $locale.DATETIME_FORMATS.SHORTMONTH.join('|'),
        'MM'    : '0[1-9]|1[012]',
        'M'     : options.strict ? '[1-9]|1[012]' : '0?[1-9]|1[012]',
        'yyyy'  : '[1]{1}[0-9]{3}|[2]{1}[0-9]{3}',
        'yy'    : '[0-9]{2}',
        'y'     : options.strict ? '-?(0|[1-9][0-9]{0,3})' : '-?0*[0-9]{1,4}',
      };

      var setFnMap = {
        'sss'   : proto.setMilliseconds,
        'ss'    : proto.setSeconds,
        's'     : proto.setSeconds,
        'mm'    : proto.setMinutes,
        'm'     : proto.setMinutes,
        'HH'    : proto.setHours,
        'H'     : proto.setHours,
        'hh'    : proto.setHours,
        'h'     : proto.setHours,
        'EEEE'  : noop,
        'EEE'   : noop,
        'dd'    : proto.setDate,
        'd'     : proto.setDate,
        'a'     : function(value) { var hours = this.getHours() % 12; return this.setHours(value.match(/pm/i) ? hours + 12 : hours); },
        'MMMM'  : function(value) { return this.setMonth(indexOfCaseInsensitive($locale.DATETIME_FORMATS.MONTH, value)); },
        'MMM'   : function(value) { return this.setMonth(indexOfCaseInsensitive($locale.DATETIME_FORMATS.SHORTMONTH, value)); },
        'MM'    : function(value) { return this.setMonth(1 * value - 1); },
        'M'     : function(value) { return this.setMonth(1 * value - 1); },
        'yyyy'  : proto.setFullYear,
        'yy'    : function(value) { return this.setFullYear(2000 + 1 * value); },
        'y'     : proto.setFullYear
      };

      var regex, setMap;

      $dateParser.init = function() {
        $dateParser.$format = $locale.DATETIME_FORMATS[options.format] || options.format;
        regex = regExpForFormat($dateParser.$format);
        setMap = setMapForFormat($dateParser.$format);
      };

      $dateParser.isValid = function(date) {
        if(angular.isDate(date)) return !isNaN(date.getTime());
        return regex.test(date);
      };

      $dateParser.parse = function(value, baseDate, format) {
        // check for date format special names
        if(format) format = $locale.DATETIME_FORMATS[format] || format;
        if(angular.isDate(value)) value = dateFilter(value, format || $dateParser.$format);
        var formatRegex = format ? regExpForFormat(format) : regex;
        var formatSetMap = format ? setMapForFormat(format) : setMap;
        var matches = formatRegex.exec(value);
        if(!matches) return false;
        // use custom ParseDate object to set parsed values
        var date = baseDate && !isNaN(baseDate.getTime()) ? new ParseDate().fromDate(baseDate) : new ParseDate().fromDate(new Date(1970, 0, 1, 0));
        for(var i = 0; i < matches.length - 1; i++) {
          formatSetMap[i] && formatSetMap[i].call(date, matches[i+1]);
        }
        // convert back to native Date object
        var newDate = date.toDate();

        // check new native Date object for day values overflow
        if (parseInt(date.day, 10) !== newDate.getDate()) {
          return false;
        }

        return newDate;
      };

      $dateParser.getDateForAttribute = function(key, value) {
        var date;

        if(value === 'today') {
          var today = new Date();
          date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (key === 'maxDate' ? 1 : 0), 0, 0, 0, (key === 'minDate' ? 0 : -1));
        } else if(angular.isString(value) && value.match(/^".+"$/)) { // Support {{ dateObj }}
          date = new Date(value.substr(1, value.length - 2));
        } else if(isNumeric(value)) {
          date = new Date(parseInt(value, 10));
        } else if (angular.isString(value) && 0 === value.length) { // Reset date
          date = key === 'minDate' ? -Infinity : +Infinity;
        } else {
          date = new Date(value);
        }

        return date;
      };

      $dateParser.getTimeForAttribute = function(key, value) {
        var time;

        if(value === 'now') {
          time = new Date().setFullYear(1970, 0, 1);
        } else if(angular.isString(value) && value.match(/^".+"$/)) {
          time = new Date(value.substr(1, value.length - 2)).setFullYear(1970, 0, 1);
        } else if(isNumeric(value)) {
          time = new Date(parseInt(value, 10)).setFullYear(1970, 0, 1);
        } else if (angular.isString(value) && 0 === value.length) { // Reset time
          time = key === 'minTime' ? -Infinity : +Infinity;
        } else {
          time = $dateParser.parse(value, new Date(1970, 0, 1, 0));
        }

        return time;
      };

      /* Handle switch to/from daylight saving.
      * Hours may be non-zero on daylight saving cut-over:
      * > 12 when midnight changeover, but then cannot generate
      * midnight datetime, so jump to 1AM, otherwise reset.
      * @param  date  (Date) the date to check
      * @return  (Date) the corrected date
      *
      * __ copied from jquery ui datepicker __
      */
      $dateParser.daylightSavingAdjust = function(date) {
        if (!date) {
          return null;
        }
        date.setHours(date.getHours() > 12 ? date.getHours() + 2 : 0);
        return date;
      };

      // Private functions

      function setMapForFormat(format) {
        var keys = Object.keys(setFnMap), i;
        var map = [], sortedMap = [];
        // Map to setFn
        var clonedFormat = format;
        for(i = 0; i < keys.length; i++) {
          if(format.split(keys[i]).length > 1) {
            var index = clonedFormat.search(keys[i]);
            format = format.split(keys[i]).join('');
            if(setFnMap[keys[i]]) {
              map[index] = setFnMap[keys[i]];
            }
          }
        }
        // Sort result map
        angular.forEach(map, function(v) {
          // conditional required since angular.forEach broke around v1.2.21
          // related pr: https://github.com/angular/angular.js/pull/8525
          if(v) sortedMap.push(v);
        });
        return sortedMap;
      }

      function escapeReservedSymbols(text) {
        return text.replace(/\//g, '[\\/]').replace('/-/g', '[-]').replace(/\./g, '[.]').replace(/\\s/g, '[\\s]');
      }

      function regExpForFormat(format) {
        var keys = Object.keys(regExpMap), i;

        var re = format;
        // Abstract replaces to avoid collisions
        for(i = 0; i < keys.length; i++) {
          re = re.split(keys[i]).join('${' + i + '}');
        }
        // Replace abstracted values
        for(i = 0; i < keys.length; i++) {
          re = re.split('${' + i + '}').join('(' + regExpMap[keys[i]] + ')');
        }
        format = escapeReservedSymbols(format);

        return new RegExp('^' + re + '$', ['i']);
      }

      $dateParser.init();
      return $dateParser;

    };

    return DateParserFactory;

  };

});
