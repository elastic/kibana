define(function (require) {
  return function buildHierarchicalDataProvider(Private, Notifier) {
    let _ = require('lodash');
    let buildSplit = Private(require('ui/agg_response/hierarchical/_build_split'));
    let extractBuckets = require('ui/agg_response/hierarchical/_extract_buckets');
    let createRawData = require('ui/agg_response/hierarchical/_create_raw_data');
    let arrayToLinkedList = require('ui/agg_response/hierarchical/_array_to_linked_list');
    let tooltipFormatter = Private(require('ui/agg_response/hierarchical/_hierarchical_tooltip_formatter'));

    let AggConfigResult = require('ui/Vis/AggConfigResult');

    let notify = new Notifier({
      location: 'Pie chart response converter'
    });

    return function (vis, resp) {
      // Create a refrenece to the buckets
      let buckets = vis.aggs.bySchemaGroup.buckets;


      // Find the metric so it's easier to reference.
      // TODO: Change this to support multiple metrics.
      let metric = vis.aggs.bySchemaGroup.metrics[0];

      // Link each agg to the next agg. This will be
      // to identify the next bucket aggregation
      buckets = arrayToLinkedList(buckets);

      // Create the raw data to be used in the spy panel
      let raw = createRawData(vis, resp);

      // If buckets is falsy then we should just return the aggs
      if (!buckets) {
        let label = 'Count';
        let value = resp.aggregations
          && resp.aggregations[metric.id]
          && resp.aggregations[metric.id].value
          || resp.hits.total;
        return {
          hits: resp.hits.total,
          raw: raw,
          names: [label],
          tooltipFormatter: tooltipFormatter(raw.columns),
          slices: {
            children: [
              { name: label, size: value }
            ]
          }
        };
      }

      let firstAgg = buckets[0];
      let aggData = resp.aggregations[firstAgg.id];

      if (!firstAgg._next && firstAgg.schema.name === 'split') {
        notify.error('Splitting charts without splitting slices is not supported. Pretending that we are just splitting slices.');
      }

      // start with splitting slices
      if (!firstAgg._next || firstAgg.schema.name === 'segment') {
        let split = buildSplit(firstAgg, metric, aggData);
        split.hits = resp.hits.total;
        split.raw = raw;
        split.tooltipFormatter = tooltipFormatter(raw.columns);
        return split;
      }

      // map the split aggregations into rows.
      let rows = _.map(extractBuckets(aggData, firstAgg), function (bucket) {
        let agg = firstAgg._next;
        let split = buildSplit(agg, metric, bucket[agg.id]);
        // Since splits display labels we need to set it.
        split.label = firstAgg.fieldFormatter()(agg.getKey(bucket));

        let displayName = firstAgg.fieldDisplayName();
        if (!_.isEmpty(displayName)) split.label += ': ' + displayName;

        split.tooltipFormatter = tooltipFormatter(raw.columns);
        let aggConfigResult = new AggConfigResult(firstAgg, null, null, firstAgg.getKey(bucket));
        split.split = { aggConfig: firstAgg, aggConfigResult: aggConfigResult, key: bucket.key };
        _.each(split.slices.children, function (child) {
          child.aggConfigResult.$parent = aggConfigResult;
        });
        return split;
      });

      let result = { hits: resp.hits.total, raw: raw };
      if (firstAgg.params.row) {
        result.rows = rows;
      } else {
        result.columns = rows;
      }

      return result;
    };
  };
});
