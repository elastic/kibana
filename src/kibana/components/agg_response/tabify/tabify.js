define(function (require) {
  return function tabifyAggResponseProvider(Private, Notifier) {
    var _ = require('lodash');

    var AggConfig = Private(require('components/vis/_agg_config'));
    var TabbedAggResponseWriter = Private(require('components/agg_response/tabify/_response_writer'));
    var Buckets = Private(require('components/agg_response/tabify/_buckets'));
    var notify = new Notifier({ location: 'agg_response/tabify'});

    function tabifyAggResponse(vis, esResponse, respOpts) {
      var write = new TabbedAggResponseWriter(vis, respOpts);

      var topLevelBucket = _.assign({}, esResponse.aggregations, {
        doc_count: esResponse.hits.total
      });

      collectBucket(write, topLevelBucket);

      return write.response();
    }

    /**
     * read an aggregation from a bucket, which is *might* be found at key (if
     * the response came in object form), and will recurse down the aggregation
     * tree and will pass the read values to the ResponseWriter.
     *
     * @param {object} bucket - a bucket from the aggResponse
     * @param {undefined|string} key - the key where the bucket was found
     * @returns {undefined}
     */
    function collectBucket(write, bucket, key) {
      var agg = write.aggStack.shift();
      var aggResp = bucket[agg.id];

      switch (agg.schema.group) {
      case 'buckets':
        var buckets = new Buckets(aggResp);
        if (buckets.length) {
          var splitting = write.canSplit && agg.schema.name === 'split';
          if (splitting) {
            write.split(agg, buckets, function forEachBucket(subBucket, key) {
              collectBucket(write, subBucket, key);
            });
          } else {
            buckets.forEach(function (subBucket, key) {
              write.cell(key, function () {
                collectBucket(write, subBucket, key);
              });
            });
          }
        } else {
          // bucket didn't result in sub-buckets, we will try to
          // write the row, but stop digging. This row.write will do nothing in
          // specific scenarios known to the the Response
          write.row();
        }
        break;
      case 'metrics':
        var value = (agg.type.name === 'count') ? bucketCount(bucket) : metricValue(aggResp);
        write.cell(value, function () {
          if (!write.aggStack.length) {
            // row complete
            write.row();
          } else {
            // process the next agg at this same level
            collectBucket(write, bucket, key);
          }
        });
        break;
      }

      write.aggStack.unshift(agg);
    }

    // read the metric value from a metric response
    function metricValue(aggResp) {
      return aggResp.value == null ? 0 : aggResp.value;
    }

    // read the bucket count from an agg bucket
    function bucketCount(bucket) {
      return bucket.doc_count;
    }

    return notify.timed('tabify agg response', tabifyAggResponse);
  };
});
