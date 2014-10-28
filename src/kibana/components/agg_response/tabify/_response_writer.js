define(function (require) {
  return function TabbedAggResponseWriterProvider(Private) {
    var _ = require('lodash');
    var Table = require('components/agg_response/tabify/_table');
    var TableSplit = require('components/agg_response/tabify/_table_split');
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

      this.root = new TableSplit();
      this.stack = [this.root];
    }

    /**
     * Create a Table of TableSplit object, link it to it's parent (if any), and determine if
     * it's the root
     *
     * @param  {boolean} group - is this a TableSplit or just a normal Table
     * @param  {AggConfig} agg - the aggregation that create this table, only applies to groups
     * @param  {any} key - the bucketKey that this table relates to
     * @return {Table/TableSplit} table - the created table
     */
    TabbedAggResponseWriter.prototype.table = function (group, agg, key) {
      var Class = (group) ? TableSplit : Table;
      var table = new Class();

      if (group) {
        table.aggConfig = agg;
        table.key = key;
        table.title = agg.makeLabel() + ': ' + key;
      }

      var parent = this.stack[0];
      // link the parent and child
      table.$parent = parent;
      parent.tables.push(table);

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
     */
    TabbedAggResponseWriter.prototype.split = function (agg, buckets, block) {
      var self = this;

      if (!self.canSplit) {
        throw new Error('attempted to split when splitting is disabled');
      }

      _.pull(self.columns, _.find(self.columns, function (col) {
        return col.aggConfig === agg;
      }));

      buckets.forEach(function (bucket, key) {
        // find the existing split that we should extend
        var tableSplit = _.find(self.stack[0].tables, { aggConfig: agg, key: key });
        // create the split if it doesn't exist yet
        if (!tableSplit) tableSplit = self.table(true, agg, key);

        // push the split onto the stack so that it will receive written tables
        self.stack.unshift(tableSplit);
        // call the block
        if (_.isFunction(block)) block.call(self, bucket, key);
        // remove the split for now
        while (true) {
          if (tableSplit === self.stack.shift()) break;
          if (self.stack.length === 0) {
            throw new Error('Table split was removed from stack... unable to proceed');
          }
        }
      });
    };

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
      if (!table || (table instanceof TableSplit)) {
        table = this.table(false);
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
      var columns = this.columns;

      // give the columns some metadata
      columns.map(function (col) {
        col.title = col.aggConfig.makeLabel();
      });

      // walk the tree and write the columns to each table
      (function step(table, group) {
        if (table.tables) table.tables.forEach(step);
        else table.columns = columns.slice(0);
      }(this.root));

      return this.canSplit ? this.root.tables : this.root.tables[0];
    };

    return TabbedAggResponseWriter;
  };
});