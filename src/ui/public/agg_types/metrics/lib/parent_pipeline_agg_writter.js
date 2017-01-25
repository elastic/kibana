const parentPipelineAggWritter = function (agg, output) {
  const vis = agg.vis;
  const orderAgg = agg.params.customMetric || vis.aggs.getResponseAggById(agg.params.metricAgg);

  if (agg.params.customMetric && agg.params.customMetric.type.name !== 'count') {
    output.parentAggs = (output.parentAggs || []).concat(orderAgg);
  }

  output.params = {};
  if (orderAgg.type.name === 'count') {
    output.params.buckets_path = '_count';
  } else {
    output.params.buckets_path = orderAgg.id;
  }
};

export { parentPipelineAggWritter };
