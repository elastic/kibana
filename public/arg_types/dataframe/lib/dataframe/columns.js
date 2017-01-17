import _ from 'lodash';

export default class Columns {
  constructor(columns) {
    this.ordered = columns;
    this.named = _.keyBy(columns, 'name');
  }
}
