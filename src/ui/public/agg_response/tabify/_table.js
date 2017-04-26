
export function AggResponseTabifyTableProvider() {
  /**
   * Simple table class that is used to contain the rows and columns that create
   * a table. This is usually found at the root of the response or within a TableGroup
   */
  function Table() {
    this.columns = null; // written with the first row
    this.rows = [];
  }

  Table.prototype.title = function () {
    if (this.$parent) {
      return this.$parent.title;
    } else {
      return '';
    }
  };

  Table.prototype.aggConfig = function (col) {
    if (!col.aggConfig) {
      throw new TypeError('Column is missing the aggConfig property');
    }
    return col.aggConfig;
  };

  Table.prototype.field = function (col) {
    return this.aggConfig(col).getField();
  };

  Table.prototype.fieldFormatter = function (col) {
    return this.aggConfig(col).fieldFormatter();
  };


  return Table;
}
