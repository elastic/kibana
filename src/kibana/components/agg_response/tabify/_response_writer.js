define(function (require) {
  return function TabbedAggResponseWriterProvider(Private) {
    var _ = require('lodash');
    var Table = Private(require('components/agg_response/tabify/_table'));
    var TableGroup = Private(require('components/agg_response/tabify/_table_group'));
    var getColumns = Private(require('components/agg_response/tabify/_get_columns'));
    var AggConfigResult = require('components/vis/_agg_config_result');

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

      var visIsHier = vis.isHierarchical();

      // do the options allow for splitting? we will only split if true and
      // tabify calls the split method.
      this.canSplit = this.opts.canSplit !== false;

      // should we allow partial rows to be included in the tables? if a
      // partial row is found, it is filled with empty strings ''
      this.partialRows = this.opts.partialRows == null ? visIsHier : this.opts.partialRows;

      // if true, we will not place metric columns after every bucket
      // even if the vis is hierarchical. if false, and the vis is
      // hierarchical, then we will display metric columns after
      // every bucket col
      this.minimalColumns = visIsHier ? !!this.opts.minimalColumns : true;

      // true if we can expect metrics to have been calculated
      // for every bucket
      this.metricsForAllBuckets = visIsHier;

      // if true, values will be wrapped in aggConfigResult objects which link them
      // to their aggConfig and enable the filterbar and tooltip formatters
      this.asAggConfigResults = !!this.opts.asAggConfigResults;

      this.columns = getColumns(vis, this.minimalColumns);
      this.aggStack = _.pluck(this.columns, 'aggConfig');

      this.root = new TableGroup();
      this.acrStack = [];
      this.splitStack = [this.root];
    }

    /**
     * Create a Table of TableGroup object, link it to it's parent (if any), and determine if
     * it's the root
     *
     * @param  {boolean} group - is this a TableGroup or just a normal Table
     * @param  {AggConfig} agg - the aggregation that create this table, only applies to groups
     * @param  {any} key - the bucketKey that this table relates to
     * @return {Table/TableGroup} table - the created table
     */
    TabbedAggResponseWriter.prototype._table = function (group, agg, key) {
      var Class = (group) ? TableGroup : Table;
      var table = new Class();
      var parent = this.splitStack[0];

      if (group) {
        table.aggConfig = agg;
        table.key = key;
        table.title = agg.makeLabel() + ': ' + (table.fieldFormatter()(key));
      }

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

      self._removeAggFromColumns(agg);

      buckets.forEach(function (bucket, key) {
        // find the existing split that we should extend
        var tableGroup = _.find(self.splitStack[0].tables, { aggConfig: agg, key: key });
        // create the split if it doesn't exist yet
        if (!tableGroup) tableGroup = self._table(true, agg, key);

        var splitAcr = false;
        if (self.asAggConfigResults) splitAcr = new AggConfigResult(agg, self.acrStack[0], key, key);

        // push the split onto the stack so that it will receive written tables
        self.splitStack.unshift(tableGroup);
        splitAcr && self.acrStack.unshift(splitAcr);

        // call the block
        if (_.isFunction(block)) block.call(self, bucket, key);

        // remove the split from the stack
        self.splitStack.shift();
        splitAcr && self.acrStack.shift();
      });
    };

    TabbedAggResponseWriter.prototype._removeAggFromColumns = function (agg) {
      var i = _.findIndex(this.columns, function (col) {
        return col.aggConfig === agg;
      });

      // we must have already removed this column
      if (i === -1) return;

      this.columns.splice(i, 1);

      if (this.minimalColumns) return;

      // hierarchical vis creats additional columns for each bucket
      // we will remove those too
      var mCol = this.columns.splice(i, 1).pop();
      var mI = _.findIndex(this.aggStack, function (agg) {
        return agg === mCol.aggConfig;
      });

      if (mI > -1) this.aggStack.splice(mI, 1);
    };

    /**
     * Push a value into the row, then run a block. Once the block is
     * complete the value is pulled from the stack.
     *
     * @param  {any} value - the value that should be added to the row
     * @param  {function} block - the function to run while this value is in the row
     * @return {any} - the value that was added
     */
    TabbedAggResponseWriter.prototype.cell = function (agg, value, block) {
      if (this.asAggConfigResults) {
        value = new AggConfigResult(agg, this.acrStack[0], value, value);
      }

      var staskResult = this.asAggConfigResults && value.type === 'bucket';

      this.rowBuffer.push(value);
      if (staskResult) this.acrStack.unshift(value);

      if (_.isFunction(block)) block.call(this);

      this.rowBuffer.pop(value);
      if (staskResult) this.acrStack.shift();

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

      if (!this.partialRows && cells.length < this.columns.length) {
        return;
      }

      var split = this.splitStack[0];
      var table = split.tables[0] || this._table(false);

      while (cells.length < this.columns.length) cells.push('');
      table.rows.push(cells);
      return table;
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

      if (this.canSplit) return this.root;

      var table = this.root.tables[0];
      if (!table) return;

      delete table.$parent;
      return table;
    };

    return TabbedAggResponseWriter;
  };
});
