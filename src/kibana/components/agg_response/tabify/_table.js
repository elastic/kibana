define(function (require) {
  return function TableProvider() {
    var _ = require('lodash');

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
      var agg = this.aggConfig(col);
      return agg.params && agg.params.field;
    };

    Table.prototype.fieldFormatter = function (col) {
      var field = this.field(col);
      return field ? field.format.convert : _.identity;
    };


    return Table;
  };
});