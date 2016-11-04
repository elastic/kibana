import _ from 'lodash';
import AggResponseTabifyResponseWriterProvider from 'ui/agg_response/tabify/_response_writer';
import AggResponseTabifyBucketsProvider from 'ui/agg_response/tabify/_buckets';
export default function tabifyAggResponseProvider(Private, Notifier) {
  const TabbedAggResponseWriter = Private(AggResponseTabifyResponseWriterProvider);
  const Buckets = Private(AggResponseTabifyBucketsProvider);
  const notify = new Notifier({ location: 'agg_response/tabify' });

  function tabifyAggResponse(vis, esResponse, respOpts) {
    const write = new TabbedAggResponseWriter(vis, respOpts);

    const topLevelBucket = _.assign({}, esResponse.aggregations, {
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
    const agg = write.aggStack.shift();

    switch (agg.schema.group) {
      case 'buckets':
        const buckets = new Buckets(bucket[agg.id]);
        if (buckets.length) {
          const splitting = write.canSplit && agg.schema.name === 'split';
          if (splitting) {
            write.split(agg, buckets, function forEachBucket(subBucket, key) {
              collectBucket(write, subBucket, agg.getKey(subBucket), key);
            });
          } else {
            buckets.forEach(function (subBucket, key) {
              write.cell(agg, agg.getKey(subBucket, key), function () {
                collectBucket(write, subBucket, agg.getKey(subBucket, key));
              });
            });
          }
        } else if (write.partialRows && write.metricsForAllBuckets && write.minimalColumns) {
          // we don't have any buckets, but we do have metrics at this
          // level, then pass all the empty buckets and jump back in for
          // the metrics.
          write.aggStack.unshift(agg);
          passEmptyBuckets(write, bucket, key);
          write.aggStack.shift();
        } else {
          // we don't have any buckets, and we don't have isHierarchical
          // data, so no metrics, just try to write the row
          write.row();
        }
        break;
      case 'metrics':
        const value = agg.getValue(bucket);
        write.cell(agg, value, function () {
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

  // write empty values for each bucket agg, then write
  // the metrics from the initial bucket using collectBucket()
  function passEmptyBuckets(write, bucket, key) {
    const agg = write.aggStack.shift();

    switch (agg.schema.group) {
      case 'metrics':
        // pass control back to collectBucket()
        write.aggStack.unshift(agg);
        collectBucket(write, bucket, key);
        return;

      case 'buckets':
        write.cell(agg, '', function () {
          passEmptyBuckets(write, bucket, key);
        });
    }

    write.aggStack.unshift(agg);
  }

  return notify.timed('tabify agg response', tabifyAggResponse);
}
