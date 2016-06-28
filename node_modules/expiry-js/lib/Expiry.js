  var
    Expiry = (function () {

      var
        millisecond = 1,
        second = millisecond * 1000,
        minute = second * 60,
        hour = 60 * minute,
        day = 24 * hour,

        unitToMilliseconds = {
          'millisecond': millisecond,
          'second': second,
          'minute': minute,
          'hour': hour,
          'day': day,
          'month': function (months, days) {

            var
              start = new Date(),
              end = new Date(start);

            end.setMonth(end.getMonth() + months);
            end.setDate(end.getDate() + days);

            return end - start;
          }
        },

        unitToUnit = {
          'milliseconds': 'millisecond', 'millisecond': 'millisecond', 'ms': 'millisecond',
          'seconds': 'second', 'second': 'second', 's': 'second',
          'minutes': 'minute', 'minute': 'minute', 'm': 'minute',
          'hours': 'hour', 'hour': 'hour', 'h': 'hour',
          'days': 'day', 'day': 'day', 'D': 'day',
          'weeks': 'week', 'week': 'week', 'W': 'week',
          'months': 'month', 'month': 'month', 'M': 'month',
          'years': 'year', 'year': 'year', 'Y': 'year'
        },

        typeOf = function typeOf(value) {
          return toString.call(value).match(/\[object (\S+)\]/).pop();
        },

        Internal = function Internal(milliseconds, days, months) {
          this.milliseconds = milliseconds || 0;
          this.days = days || 0;
          this.months = months || 0;
        },

        createInternal = function (value, unit) {

          var
            milliseconds = 0,
            days = 0,
            months = 0;

          switch(unit) {
            case 'year':
              months += value * 12;
              break;
            case 'month':
              months += value;
              break;
            case 'week':
              days += value * 7;
              break;
            case 'day':
              days += value;
              break;
            case 'hour':
            case 'minute':
            case 'second':
            case 'millisecond':
              milliseconds += value * unitToMilliseconds[unit];
              break;
            default:
          }

          return new Internal(milliseconds, days, months);
        },

        round = Math.round;


      function Expiry(value, maybeUnit) {

        value = value || 0;

        var
          unit = unitToUnit[maybeUnit || 'millisecond'];

        if ( ! unit) {
          throw new Error('Invalid unit, '+maybeUnit);
        }

        var
          type = typeOf(value),
          internal;

        if (type === 'Number') {
          internal = createInternal(value, unit);
        } else if (type === 'String') {
          internal = Expiry.parse(value, unit);
        } else {
          throw new Error('Invalid value, '+value);
        }

        this._internal = internal;
      }

      Expiry.forge = function (value, maybeUnit) {
        return new this(value, maybeUnit);
      };

      Expiry.parse = function (value, unit) {

        if (typeOf(value) !== 'String') {
          throw new Error('Invalid value, '+value);
        }

        var
          re = /^[\d\.]+$/g;

        if (re.test(value)) {
          value += unit;
        }

        var
          result,

          maybeValue,
          maybeUnit,
          unit,

          milliseconds = 0,
          days = 0,
          months = 0;

        re = /([\d\.]+)\s*([a-zA-Z]+)/g;

        while ((result = re.exec(value)) !== null) {

          maybeValue = parseFloat(result[1]);
          maybeUnit = result[2];
          unit = unitToUnit[maybeUnit];

          switch(unit) {
            case 'year':
              months += maybeValue * 12;
              break;
            case 'month':
              months += maybeValue;
              break;
            case 'week':
              days += maybeValue * 7;
              break;
            case 'day':
              days += maybeValue;
              break;
            case 'hour':
            case 'minute':
            case 'second':
            case 'millisecond':
              milliseconds += maybeValue * unitToMilliseconds[unit];
              break;
            default:
              throw new Error('Missing or invalid unit, '+maybeUnit);
          }
        }

        return new Internal(milliseconds, days, months);
      };

      Expiry.prototype.valueOf = function () {

        var
          internal = this._internal,

          milliseconds = internal.milliseconds,
          days = internal.days,
          months = internal.months;

        return milliseconds + unitToMilliseconds.month(months, days);
      };

      Expiry.prototype.asMilliseconds = function () {
        return this.valueOf();
      };

      Expiry.prototype.asSeconds = function () {
        return round(this.valueOf() / second);
      };

      return Expiry;
    }());

  void Expiry;
