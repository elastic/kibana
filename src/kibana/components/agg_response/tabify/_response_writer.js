define(function (require) {
  return function TabbedAggResponseWriterProvider(Private) {
    var _ = require('lodash');
    var getColumns = require('components/agg_response/tabify/_get_columns');

    /**
     * Writer class that collects information about an aggregation response and
     * produces a table, or a series of tables.
     *
     * @param {Vis} vis - the vis object to which the aggregation response correlates
     */
    function TabbedAggResponseWriter(vis, opts) {
      this.vis = vis;
      this.opts = opts || {};
      this.rowBuffer = [];

      this.columns = getColumns(vis);
      this.aggStack = _.pluck(this.columns, 'aggConfig');
      this.canSplit = this.opts.canSplit !== false;

      this.root = new TableGroup();
      this.stack = [this.root];
    }

    /**
     * Simple table class that is used to contain the rows and columns that create
     * a table. This is usually found at the root of the response or within a TableGroup
     *
     * @param {TableGroup} parent - the TableGroup that should contain this Table
     */
    function Table(agg, key) {
      this.rows = [];
      this.columns = null; // written with the first row
      this.aggConfig = agg;
      this.key = key;
    }

    /**
     * Simple object that wraps multiple tables. It contains information about the aggConfig
     * and bucket that created this group and a list of the tables within it.
     *
     * @param {AggConfig} agg - The aggregation that created this bucket
     * @param {any} key - The key for the bucket that created this agg
     * @param {TableGroup} [parent] - option TableGroup that owns this TableGroup
     */
    function TableGroup(agg) {
      this.tables = [];
      this.aggConfig = agg;
    }

    /**
     * Create a Table of TableGroup object, link it to it's parent (if any), and determine if
     * it's the root
     *
     * @param  {boolean} group - is this a TableGroup or just a normal Table
     * @param  {TableGroup} parent - the group that owns this table
     * @param  {AggConfig} agg - the aggregation that create this table, only applies to groups
     * @param  {any} key - the bucketKey that this table relates to
     * @return {Table/TableGroup} table - the created table
     */
    TabbedAggResponseWriter.prototype.table = function (group, parent, agg, key) {
      var table;
      if (group) {
        table = new TableGroup(agg);
      } else {
        table = new Table(agg, key);
      }

      // if there hasn't been a root yet, this is it
      if (!this.root) this.root = table;

      // link the parent and child
      table.$parent = parent;
      if (parent) {
        parent.tables = parent.tables || [];
        parent.tables.push(table);
      }

      return table;
    };

    /**
     * Enter into a split table, called for each bucket of a splitting agg. The new table
     * is either created or located using the agg and key arguments, and then the block is
     * executed with the table as it's this context. Within this function, you should
     * walk into the remaining branches and end up writing some rows to the table.
     *
     * @param  {aggConfig} agg - the aggConfig that created this split
     * @param  {Buckets} buckets - the buckets produces by the agg
     * @param  {function} block - a function to execute for each sub bucket
     * @return {TableGroup} tableGroup - the table group created for the split
     */
    TabbedAggResponseWriter.prototype.split = function (agg, buckets, block) {
      var self = this;

      if (!self.canSplit) {
        throw new Error('attempted to split when splitting is disabled');
      }

      var parent = self.stack[0];
      var tableGroup = findTable(parent, agg) || self.table(true, self.stack[0], agg);
      _.pull(self.columns, _.find(self.columns, function (col) {
        return col.aggConfig === agg;
      }));

      self.stack.unshift(tableGroup);
      buckets.forEach(function (bucket, key) {
        var table = findTable(tableGroup, agg, key);
        if (!table) {
          table = self.table(false, tableGroup, agg, key);
          table.title = agg.makeLabel() + ': ' + key;
        }

        self.stack.unshift(table);
        if (_.isFunction(block)) block.call(self, bucket, key);
        self.stack.shift();
      });
      self.stack.shift();

      return tableGroup;
    };

    function findTable(tableGroup, agg, key) {
      return _.find(tableGroup.tables, function (table) {
        return table.aggConfig === agg && table.key === key;
      });
    }

    /**
     * Push a value into the row, then run a block. Once the block is
     * complete the value is pulled from the stack.
     *
     * @param  {any} value - the value that should be added to the row
     * @param  {function} block - the function to run while this value is in the row
     * @return {any} - the value that was added
     */
    TabbedAggResponseWriter.prototype.cell = function (value, block) {
      this.rowBuffer.push(value);
      if (_.isFunction(block)) block.call(this);
      this.rowBuffer.pop(value);

      return value;
    };

    /**
     * Create a new row by reading the row buffer. This will do nothing if
     * the row is incomplete and the vis this data came from is NOT flagged as
     * hierarchical.
     *
     * @param  {array} [buffer] - optional buffer to use in place of the stored rowBuffer
     * @return {undefined}
     */
    TabbedAggResponseWriter.prototype.row = function (buffer) {
      var cells = buffer || this.rowBuffer.slice(0);

      if (!this.vis.isHierarchical() && cells.length < this.columns.length) {
        return;
      }

      var table = this.stack[0];
      if (!table || table === this.root) {
        table = this.table(false, table);
        this.stack.unshift(table);
      }

      while (cells.length < this.columns.length) cells.push('');
      table.rows.push(cells);
    };

    /**
     * Get the actual response
     *
     * @return {object} - the final table-tree
     */
    TabbedAggResponseWriter.prototype.response = function () {
      var table = this.root.tables[0];
      if (!table) return;
      delete table.$parent;

      var columns = this.columns;

      // give the columns some metadata
      columns.map(function (col) {
        col.title = col.aggConfig.makeLabel();
      });

      // walk the tree and write the columns to each table
      (function step(table) {
        if (table.tables) table.tables.forEach(step);
        else table.columns = columns.slice(0);
      }(table));

      return table;
    };

    return TabbedAggResponseWriter;
  };
});