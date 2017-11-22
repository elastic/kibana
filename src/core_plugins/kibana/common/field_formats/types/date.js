import _ from 'lodash';
import moment from 'moment';

export function createDateFormat(FieldFormat) {
  return class DateFormat extends FieldFormat {
    constructor(params, getConfig) {
      super(params);

      this.getConfig = getConfig;
    }

    getParamDefaults() {
      return {
        pattern: this.getConfig('dateFormat'),
        timezone: this.getConfig('dateFormat:tz')
      };
    }

    _convert(val) {
      // don't give away our ref to converter so
      // we can hot-swap when config changes
      const pattern = this.param('pattern');
      const timezone = this.param('timezone');

      const timezoneChanged = this._timeZone !== timezone;
      const datePatternChanged = this._memoizedPattern !== pattern;
      if (timezoneChanged || datePatternChanged) {
        this._timeZone = timezone;
        this._memoizedPattern = pattern;

        this._memoizedConverter = _.memoize(function converter(val) {
          if (val === null || val === undefined) {
            return '-';
          }

          const date = moment(val);
          if (date.isValid()) {
            return date.format(pattern);
          } else {
            return val;
          }
        });
      }

      return this._memoizedConverter(val);
    }

    static id = 'date';
    static title = 'Date';
    static fieldType = 'date';
  };
}
