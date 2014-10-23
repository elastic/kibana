define(function (require) {
  return function tabifyAggResponseProvider(Private) {

    var _ = require('lodash');
    var AggConfig = Private(require('components/vis/_agg_config'));

    var getColumns = require('components/agg_response/tabify/_get_columns');
    var RowWriter = require('components/agg_response/tabify/_row_writer');
    var Buckets = require('components/agg_response/tabify/_buckets');

    function tabifyAggResponse(vis, resp) {

      // Create the initial results structure
      var rows = [];
      var columns = getColumns(vis);

      // pull columns off the top of this stack while recursing
      var aggStack = _.pluck(columns, 'aggConfig');

      // write row cells here while itterating, then call row.write()
      var row = new RowWriter(vis, rows, columns);

      /**
       * read an aggregation from a bucket, which is maybe found at key,
       * and will recurse down if the aggregation creates buckets, and then
       * will pass the read values to the row, which writes to the rows array.
       *
       * @param {object} bucket - a bucket from the aggResponse
       * @param {undefined|string} key - the key where the bucket was found
       * @returns {undefined}
       */
      function collectBucket(bucket, key) {
        var agg = aggStack.shift();
        var aggResp = bucket[agg.id];

        switch (agg.schema.group) {
        case 'buckets':
          var buckets = new Buckets(aggResp);
          if (buckets.length) {
            buckets.forEach(function (subBucket, key) {
              row.push(bucketKey(subBucket, key));
              collectBucket(subBucket, key);
              row.pop();
            });
          } else {
            // bucket didn't result in sub-buckets, we will try to
            // write the row, but stop digging. This row.write will do nothing in
            // specific scenarios known to the RowWriter
            row.write();
          }
          break;
        case 'metrics':
          if (aggResp) {
            row.push(metricValue(aggResp));
          } else {
            row.push(bucketCount(bucket));
          }

          if (!aggStack.length) {
            row.write();
          } else {
            // process the next agg at this same level
            collectBucket(bucket, key);
          }

          row.pop();
          break;
        }

        aggStack.unshift(agg);
      }

      if (columns.length) {
        collectBucket(resp.aggregations);
      } else {
        // special case where there are no aggregations,
        // we return a temporary "count" aggregation which reads
        // the total search hit count
        columns.push({
          aggConfig: new AggConfig(vis, {
            type: 'count',
            schema: 'metrics'
          })
        });
        rows.push([resp.hits.total]);
      }

      return {
        rows: rows,
        columns: columns
      };
    }

    function metricValue(aggResp) {
      return aggResp.value == null ? 0 : aggResp.value;
    }

    function bucketCount(bucket) {
      return bucket.doc_count;
    }

    function bucketKey(bucket, key) {
      if (key != null) return key;
      return bucket.key;
    }

    return tabifyAggResponse;
  };
});
