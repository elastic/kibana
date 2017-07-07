import { VisVisTypeProvider } from 'ui/vis/vis_type';
import { VislibVisTypeVislibVisTypeProvider } from 'ui/vislib_vis_type/vislib_vis_type';
import { VisSchemasProvider } from 'ui/vis/schemas';
import gaugeTemplate from 'plugins/kbn_vislib_vis_types/editors/gauge.html';
import { vislibColorMaps } from 'ui/vislib/components/color/colormaps';
import image from './images/icon-number.svg';

export default function MetricVisType(Private) {
  const VisType = Private(VisVisTypeProvider);
  const VislibVisType = Private(VislibVisTypeVislibVisTypeProvider);
  const Schemas = Private(VisSchemasProvider);

  return new VislibVisType({
    name: 'metric',
    title: 'Metric',
    image,
    description: 'Display a calculation as a single number',
    category: VisType.CATEGORY.DATA,
    params: {
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
            bgFill: '#000',
            bgColor: false,
            labelColor: false,
            subText: ''
          }
        }
      },
      gaugeTypes: ['Arc', 'Circle', 'Metric'],
      gaugeColorMode: ['None', 'Labels', 'Background'],
      scales: ['linear', 'log', 'square root'],
      colorSchemas: Object.keys(vislibColorMaps),
      editor: gaugeTemplate
    },
    implementsRenderComplete: true,
    schemas: new Schemas([
      {
        group: 'metrics',
        name: 'metric',
        title: 'Metric',
        min: 1,
        aggFilter: [
          '!std_dev', '!geo_centroid', '!percentiles', '!percentile_ranks',
          '!derivative', '!serial_diff', '!moving_avg', '!cumulative_sum'],
        defaults: [
          { schema: 'metric', type: 'count' }
        ]
      },
      {
        group: 'buckets',
        name: 'group',
        title: 'Split Group',
        min: 0,
        max: 1,
        aggFilter: '!geohash_grid'
      }
    ])
  });
}
