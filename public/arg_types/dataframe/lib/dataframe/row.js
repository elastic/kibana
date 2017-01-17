import _ from 'lodash';
import Columns from './columns';
import Field from './field';

export default class Row {
  constructor(columns, row) {
    if (!(columns instanceof Columns)) throw 'columns must be an instance of Columns';

    this.columns = columns;
    this.ordered = _.map(this.columns.ordered, column => new Field(row, column));
    this.named = _.mapValues(row, (value, name) => new Field(row, columns.named[name]));
  }

}
