import moment from 'moment';

export function createRelativeDateFormat(FieldFormat) {
  return class RelativeDateFormat extends FieldFormat {
    constructor(params) {
      super(params);
    }

    _convert(val) {
      if (val === null || val === undefined) {
        return '-';
      }

      const date = moment(val);
      if (date.isValid()) {
        return date.fromNow();
      } else {
        return val;
      }
    }

    static id = 'relative_date';
    static title = 'Relative Date';
    static fieldType = 'date';
  };
}
