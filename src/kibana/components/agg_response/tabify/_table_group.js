define(function (require) {
  return function TableGroupProvider() {
    var _ = require('lodash');

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
      return this.aggConfig && this.aggConfig.params && this.aggConfig.params.field;
    };

    TableGroup.prototype.fieldFormat = function () {
      var field = this.field();
      return field ? field.format.convert : _.identity;
    };

    return TableGroup;
  };
});