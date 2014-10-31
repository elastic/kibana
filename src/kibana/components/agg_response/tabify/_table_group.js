define(function (require) {
  return function TableGroupProvider() {
    /**
     * Simple object that wraps multiple tables. It contains information about the aggConfig
     * and bucket that created this group and a list of the tables within it.
     */
    function TableGroup() {
      this.aggConfig = null;
      this.key = null;
      this.title = null;
      this.tables = [];
    }

    return TableGroup;
  };
});