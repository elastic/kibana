import moment from 'moment';
import { FieldFormat } from '../../../../../ui/field_formats/field_format';

export class RelativeDateFormat extends FieldFormat {
  constructor(params) {
    super(params);
  }

  _convert(val) {
    return moment(val).fromNow();
  }

  static id = 'relative_date';
  static title = 'Relative Date';
  static fieldType = 'date';
}
