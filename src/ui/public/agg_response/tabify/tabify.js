import _ from 'lodash';
import { TabbedAggResponseWriter } from './_response_writer';
import { TabifyBuckets } from './_buckets';

export function tabifyAggResponse(aggs, esResponse, respOpts = {}) {
  const write = new TabbedAggResponseWriter(aggs, respOpts);

  const topLevelBucket = _.assign({}, esResponse.aggregations, {
    doc_count: esResponse.hits.total
  });

  collectBucket(write, topLevelBucket, '', 1);

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
function collectBucket(write, bucket, key, aggScale) {
  const agg = write.aggStack.shift();
  const aggInfo = agg.write();
  aggScale *= aggInfo.metricScale || 1;

  switch (agg.schema.group) {
    case 'buckets':
      const buckets = new TabifyBuckets(bucket[agg.id], agg.params);
      if (buckets.length) {
        const splitting = write.canSplit && agg.schema.name === 'split';
        if (splitting) {
          write.split(agg, buckets, function forEachBucket(subBucket, key) {
            collectBucket(write, subBucket, agg.getKey(subBucket, key), aggScale);
          });
        } else {
          buckets.forEach(function (subBucket, key) {
            write.cell(agg, agg.getKey(subBucket, key), function () {
              collectBucket(write, subBucket, agg.getKey(subBucket, key), aggScale);
            }, subBucket.filters);
          });
        }
      } else if (write.partialRows && write.metricsForAllBuckets && write.minimalColumns) {
        // we don't have any buckets, but we do have metrics at this
        // level, then pass all the empty buckets and jump back in for
        // the metrics.
        write.aggStack.unshift(agg);
        passEmptyBuckets(write, bucket, key, aggScale);
        write.aggStack.shift();
      } else {
        // we don't have any buckets, and we don't have isHierarchical
        // data, so no metrics, just try to write the row
        write.row();
      }
      break;
    case 'metrics':
      let value = agg.getValue(bucket);
      // since the aggregation could be a non integer (such as a max date)
      // only do the scaling calculation if it is needed.
      if (aggScale !== 1) {
        value *= aggScale;
      }
      write.cell(agg, value, function () {
        if (!write.aggStack.length) {
          // row complete
          write.row();
        } else {
          // process the next agg at this same level
          collectBucket(write, bucket, key, aggScale);
        }
      });
      break;
  }

  write.aggStack.unshift(agg);
}

// write empty values for each bucket agg, then write
// the metrics from the initial bucket using collectBucket()
function passEmptyBuckets(write, bucket, key, aggScale) {
  const agg = write.aggStack.shift();

  switch (agg.schema.group) {
    case 'metrics':
      // pass control back to collectBucket()
      write.aggStack.unshift(agg);
      collectBucket(write, bucket, key, aggScale);
      return;

    case 'buckets':
      write.cell(agg, '', function () {
        passEmptyBuckets(write, bucket, key, aggScale);
      });
  }

  write.aggStack.unshift(agg);
}

