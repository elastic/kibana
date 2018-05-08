import _ from 'lodash';
import { extractBuckets } from './_extract_buckets';
import { createRawData } from './_create_raw_data';
import { arrayToLinkedList } from './_array_to_linked_list';
import AggConfigResult from '../../vis/agg_config_result';
import { AggResponseHierarchicalBuildSplitProvider } from './_build_split';
import { HierarchicalTooltipFormatterProvider } from './_hierarchical_tooltip_formatter';

export function BuildHierarchicalDataProvider(Private, Notifier) {
  const buildSplit = Private(AggResponseHierarchicalBuildSplitProvider);
  const tooltipFormatter = Private(HierarchicalTooltipFormatterProvider);


  const notify = new Notifier({
    location: 'Pie chart response converter'
  });

  return function (vis, resp) {
    // Create a refrenece to the buckets
    let buckets = vis.getAggConfig().bySchemaGroup.buckets;

    // Find the metric so it's easier to reference.
    // TODO: Change this to support multiple metrics.
    const metric = vis.getAggConfig().bySchemaGroup.metrics[0];

    // Link each agg to the next agg. This will be
    // to identify the next bucket aggregation
    buckets = arrayToLinkedList(buckets);

    // Create the raw data to be used in the spy panel
    const raw = createRawData(vis, resp);

    // If buckets is falsy then we should just return the aggs
    if (!buckets) {
      const label = raw.columns[0].label;
      const value = resp.aggregations
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

    const firstAgg = buckets[0];
    const aggData = resp.aggregations ? resp.aggregations[firstAgg.id] : null;

    if (!firstAgg._next && firstAgg.schema.name === 'split') {
      notify.error('Splitting charts without splitting slices is not supported. Pretending that we are just splitting slices.');
    }

    // start with splitting slices
    if (!firstAgg._next || firstAgg.schema.name === 'segment') {
      const split = buildSplit(firstAgg, metric, aggData);
      split.hits = resp.hits.total;
      split.raw = raw;
      split.tooltipFormatter = tooltipFormatter(raw.columns);
      return split;
    }

    // map the split aggregations into rows.
    const rows = _.map(extractBuckets(aggData, firstAgg), function (bucket) {
      const agg = firstAgg._next;
      const split = buildSplit(agg, metric, bucket[agg.id]);
      // Since splits display labels we need to set it.
      split.label = firstAgg.fieldFormatter()(agg.getKey(bucket));

      const displayName = firstAgg.getFieldDisplayName();
      if (!_.isEmpty(displayName)) split.label += ': ' + displayName;

      split.tooltipFormatter = tooltipFormatter(raw.columns);
      const aggConfigResult = new AggConfigResult(firstAgg, null, null, firstAgg.getKey(bucket), bucket.filters);
      split.split = { aggConfig: firstAgg, aggConfigResult: aggConfigResult, key: bucket.key };
      _.each(split.slices.children, function (child) {
        child.aggConfigResult.$parent = aggConfigResult;
      });
      return split;
    });

    const result = { hits: resp.hits.total, raw: raw };
    if (firstAgg.params.row) {
      result.rows = rows;
    } else {
      result.columns = rows;
    }

    return result;
  };
}
