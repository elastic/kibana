import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { VisSchemasProvider } from 'ui/vis/editors/default/schemas';
import { CATEGORY } from 'ui/vis/vis_category';
import gaugeTemplate from 'plugins/kbn_vislib_vis_types/editors/gauge.html';
import { vislibColorMaps } from 'ui/vislib/components/color/colormaps';
import { AggTypesIndexProvider } from 'ui/agg_types';
import image from './images/icon-number.svg';

export default function MetricVisType(Private) {
  const VisFactory = Private(VisFactoryProvider);
  const Schemas = Private(VisSchemasProvider);
  const AggTypes = Private(AggTypesIndexProvider);

  return VisFactory.createVislibVisualization({
    name: 'metric',
    title: 'Metric',
    image,
    description: 'Display a calculation as a single number',
    category: CATEGORY.DATA,
    visConfig: {
      defaults: {
        addTooltip: true,
        addLegend: false,
        type: 'gauge',
        gauge: {
          verticalSplit: false,
          autoExtend: false,
          percentageMode: false,
          gaugeType: 'Metric',
          gaugeStyle: 'Full',
          backStyle: 'Full',
          orientation: 'vertical',
          colorSchema: 'Green to Red',
          gaugeColorMode: 'None',
          useRange: false,
          colorsRange: [
            { from: 0, to: 100 },
          ],
          invertColors: false,
          labels: {
            show: true,
            color: 'black'
          },
          scale: {
            show: false,
            labels: false,
            color: '#333',
            width: 2
          },
          type: 'simple',
          style: {
            fontSize: 60,
            bgColor: false,
            labelColor: false,
            subText: ''
          }
        }
      },
    },
    editorConfig: {
      collections: {
        gaugeTypes: ['Arc', 'Circle', 'Metric'],
        gaugeColorMode: ['None', 'Labels', 'Background'],
        scales: ['linear', 'log', 'square root'],
        colorSchemas: Object.keys(vislibColorMaps),
      },
      optionsTemplate: gaugeTemplate,
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: 'Metric',
          min: 1,
          aggFilter: [
            AggTypes.byName.count.name,
            AggTypes.byName.avg.name,
            AggTypes.byName.sum.name,
            AggTypes.byName.median.name,
            AggTypes.byName.min.name,
            AggTypes.byName.max.name,
            AggTypes.byName.std_dev.name,
            AggTypes.byName.cardinality.name,
            AggTypes.byName.percentiles.name,
            AggTypes.byName.percentile_ranks.name,
            AggTypes.byName.top_hits.name,
            AggTypes.byName.cumulative_sum.name,
            AggTypes.byName.moving_avg.name,
            AggTypes.byName.serial_diff.name,
            AggTypes.byName.avg_bucket.name,
            AggTypes.byName.sum_bucket.name,
            AggTypes.byName.min_bucket.name,
            AggTypes.byName.max_bucket.name
          ],
          defaults: [
            { schema: 'metric', type: AggTypes.byName.count.name }
          ]
        },
        {
          group: 'buckets',
          name: 'group',
          title: 'Split Group',
          min: 0,
          max: 1,
          aggFilter: [
            AggTypes.byName.date_histogram.name,
            AggTypes.byName.histogram.name,
            AggTypes.byName.range.name,
            AggTypes.byName.date_range.name,
            AggTypes.byName.ip_range.name,
            AggTypes.byName.terms.name,
            AggTypes.byName.filters.name
          ]
        }
      ])
    }
  });
}
