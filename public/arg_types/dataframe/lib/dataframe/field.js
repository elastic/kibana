export default class Field {
  constructor(row, column) {
    this.value = row[column.name];
    this.row = row;
    this.column = column;
  }
}
