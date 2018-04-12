/**
 * Simple table class that is used to contain the rows and columns that create
 * a table. This is usually found at the root of the response or within a TableGroup
 */
function TabifyTable() {
  this.columns = null; // written with the first row
  this.rows = [];
}

TabifyTable.prototype.title = function () {
  if (this.$parent) {
    return this.$parent.title;
  } else {
    return '';
  }
};

TabifyTable.prototype.aggConfig = function (col) {
  if (!col.aggConfig) {
    throw new TypeError('Column is missing the aggConfig property');
  }
  return col.aggConfig;
};

TabifyTable.prototype.field = function (col) {
  return this.aggConfig(col).getField();
};

TabifyTable.prototype.fieldFormatter = function (col) {
  return this.aggConfig(col).fieldFormatter();
};


export { TabifyTable };
