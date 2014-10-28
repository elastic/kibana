define(function (require) {

  /**
   * Simple object that wraps multiple tables. It contains information about the aggConfig
   * and bucket that created this group and a list of the tables within it.
   */
  function TableSplit() {
    this.aggConfig = null;
    this.key = null;
    this.title = null;
    this.tables = [];
  }

  return TableSplit;
});