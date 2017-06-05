const siblingPipelineAggWritter = function (agg, output) {
  if (!agg.params.customMetric) return;

  const metricAgg = agg.params.customMetric;
  const bucketAgg = agg.params.customBucket;

  // if a bucket is selected, we must add this agg as a sibling to it, and add a metric to that bucket (or select one of its)
  if (metricAgg.type.name !== 'count') {
    bucketAgg.subAggs = (output.subAggs || []).concat(metricAgg);
    output.params.buckets_path = `${bucketAgg.id}>${metricAgg.id}`;
  } else {
    output.params.buckets_path = bucketAgg.id + '>_count';
  }

  output.parentAggs = (output.parentAggs || []).concat(bucketAgg);

};

export { siblingPipelineAggWritter };
