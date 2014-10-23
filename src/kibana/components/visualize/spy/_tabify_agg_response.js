define(function (require) {
  return function tabifyAggResponseProvider(Private) {

    var _ = require('lodash');
    var extractBuckets = require('components/chart_data/hierarchical/_extract_buckets');
    var AggConfig = Private(require('components/vis/_agg_config'));

    function tabifyAggResponse(vis, resp) {

      // Create the initial results structure
      var rows = [];
      var columns = getColumns(vis);

      // pull columns off the top of this stack while recursing
      var aggStack = _.pluck(columns, 'aggConfig');
      // write row cells here while itterating, then call writeRow()
      var rowMemo = [];

      // copy the rowMemo into the rows object, filling in or ignoring when appropriate
      function writeRow() {
        if (rowMemo.length !== columns.length && !isHierarchical(vis)) {
          return;
        }

        var row = rowMemo.slice(0);
        while (row.length < columns.length) row.push('');
        rows.push(row);
      }

      // start with the top level "bucket" and recurse into all sub-buckets
      function collectBucket(bucket, key) {
        var agg = aggStack.shift();
        var aggResp = bucket[agg.id];

        switch (agg.schema.group) {
        case 'buckets':
          eachBucket(aggResp, function (subBucket, key) {
            rowMemo.push(bucketKey(subBucket, key));
            collectBucket(subBucket, key);
            rowMemo.pop();
          });
          break;
        case 'metrics':
          if (aggResp) {
            rowMemo.push(metricValue(aggResp));
          } else {
            rowMemo.push(bucketCount(bucket));
          }

          if (!aggStack.length) {
            writeRow();
          } else {
            // process the next agg at this same level
            collectBucket(bucket, key);
          }

          rowMemo.pop();
          break;
        }

        aggStack.unshift(agg);
      }

      if (columns.length) {
        collectBucket(resp.aggregations);
      } else {
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

    function eachBucket(aggResp, fn) {
      // buckets come as arrays or objects
      if (_.isArray(aggResp.buckets)) {
        // when arrays we don't send a key arg
        aggResp.buckets.forEach(function (bucket) {
          fn(bucket);
        });
      }
      else if (_.isPlainObject(aggResp.buckets)) {
        // when objects, we send the key arg
        _.forOwn(aggResp.buckets, fn);
      }
    }

    function isHierarchical(vis) {
      return !!vis.type.hierarchicalData;
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

    function getColumns(vis) {
      var aggs = vis.aggs.getSorted();

      // pick the columns
      if (!isHierarchical(vis)) {
        return aggs.map(function (agg) {
          return { aggConfig: agg };
        });
      }

      var columns = [];

      // columns are bucket,metric,bucket,metric...
      var metrics = _.where(aggs, function (agg) {
        return agg.schema.group === 'metrics';
      });

      aggs.forEach(function (agg) {
        if (agg.schema.group !== 'buckets') return;
        columns.push({ aggConfig: agg });
        metrics.forEach(function (metric) {
          columns.push({ aggConfig: metric });
        });
      });

      return columns;
    }

    return tabifyAggResponse;
  };
});
