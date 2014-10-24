define(function (require) {
  return function tabifyAggResponseProvider(Private, Notifier) {
    var _ = require('lodash');

    var AggConfig = Private(require('components/vis/_agg_config'));
    var TabbedAggResponseWriter = Private(require('components/agg_response/tabify/_response'));
    var Buckets = require('components/agg_response/tabify/_buckets');
    var notify = new Notifier({ location: 'agg_response/tabify'});

    function tabifyAggResponse(vis, esResponse, respOpts) {
      var resp = new TabbedAggResponseWriter(vis, respOpts);
      var topLevelBucket = _.assign({}, esResponse.aggregations, {
        doc_count: esResponse.hits.total
      });

      if (!resp.aggStack.length) {
        var schema = vis.type.schemas.metrics[0];
        if (!schema) {
          throw new Error('Unable to tabify empty response without a metric schema of some sort');
        }

        // special case where there are no aggregations,
        // we return a temporary "count" aggregation which reads
        // the total search hit count
        var tempCountAgg = new AggConfig(vis, {
          type: 'count',
          schema: schema
        });
        resp.columns.push({
          aggConfig: tempCountAgg
        });
        resp.aggStack.push(tempCountAgg);
      }

      collectBucket(resp, topLevelBucket);

      return resp.done();
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
    function collectBucket(resp, bucket, key) {
      var agg = resp.aggStack.shift();
      var aggResp = bucket[agg.id];

      switch (agg.schema.group) {
      case 'buckets':
        var buckets = new Buckets(aggResp);
        if (buckets.length) {
          var splitting = resp.canSplit && agg.schema.name === 'split';

          buckets.forEach(function collectSubBucket(subBucket, subBucketKey) {
            var key = bucketKey(subBucket, subBucketKey);
            var recurse = function () {
              collectBucket(resp, subBucket, key);
            };

            if (splitting) resp.split(agg, key, recurse);
            else resp.cell(key, recurse);
          });
        } else {
          // bucket didn't result in sub-buckets, we will try to
          // write the row, but stop digging. This row.write will do nothing in
          // specific scenarios known to the the Response
          resp.row();
        }
        break;
      case 'metrics':
        resp.cell(aggResp ? metricValue(aggResp) : bucketCount(bucket), function () {
          if (!resp.aggStack.length) {
            // row complete
            resp.row();
          } else {
            // process the next agg at this same level
            collectBucket(resp, bucket, key);
          }
        });
        break;
      }

      resp.aggStack.unshift(agg);
    }

    // read the metric value from a metric response
    function metricValue(aggResp) {
      return aggResp.value == null ? 0 : aggResp.value;
    }

    // read the bucket count from an agg bucket
    function bucketCount(bucket) {
      return bucket.doc_count;
    }

    // read the key from an agg bucket, optionally use the key the bucket
    // was found at
    function bucketKey(bucket, key) {
      if (key != null) return key;
      return bucket.key;
    }

    return notify.timed('tabify agg response', tabifyAggResponse);
  };
});
