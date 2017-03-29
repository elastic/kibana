export default function TableGroupProvider() {

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

  TableGroup.prototype.field = function () {
    if (this.aggConfig) return this.aggConfig.getField();
  };

  TableGroup.prototype.fieldFormatter = function () {
    if (this.aggConfig) return this.aggConfig.fieldFormatter();
  };

  return TableGroup;
}
