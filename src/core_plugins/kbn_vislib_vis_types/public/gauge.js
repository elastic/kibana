import { VisVisTypeProvider } from 'ui/vis/vis_type';
import { VislibVisTypeVislibVisTypeProvider } from 'ui/vislib_vis_type/vislib_vis_type';
import { VisSchemasProvider } from 'ui/vis/schemas';
import gaugeTemplate from 'plugins/kbn_vislib_vis_types/editors/gauge.html';
import { vislibColorMaps } from 'ui/vislib/components/color/colormaps';
import image from './images/icon-gauge.svg';

export default function GaugeVisType(Private) {
  const VisType = Private(VisVisTypeProvider);
  const VislibVisType = Private(VislibVisTypeVislibVisTypeProvider);
  const Schemas = Private(VisSchemasProvider);

  return new VislibVisType({
    name: 'gauge',
    title: 'Gauge',
    image,
    description: `Gauges indicate the status of a metric. Use it to show how a metric's value relates 
      to reference threshold values.`,
    category: VisType.CATEGORY.DATA,
    params: {
      defaults: {
        addTooltip: true,
        addLegend: true,

        gauge: {
          verticalSplit: false,
          extendRange: true,
          percentageMode: false,
          gaugeType: 'Arc',
          gaugeStyle: 'Full',
          backStyle: 'Full',
          orientation: 'vertical',
          colorSchema: 'Green to Red',
          gaugeColorMode: 'Labels',
          colorsRange: [
            { from: 0, to: 50 },
            { from: 50, to: 75 },
            { from: 75, to: 100 }
          ],
          invertColors: false,
          labels: {
            show: true,
            color: 'black'
          },
          scale: {
            show: true,
            labels: false,
            color: '#333',
          },
          type: 'meter',
          style: {
            bgWidth: 0.9,
            width: 0.9,
            mask: false,
            bgMask: false,
            maskBars: 50,
            bgFill: '#eee',
            bgColor: true,
            subText: '',
            fontSize: 60,
          }
        }
      },
      gaugeTypes: ['Arc', 'Circle', 'Metric'],
      gaugeColorMode: ['None', 'Labels', 'Background'],
      gaugeStyles: ['Full', 'Bars', 'Lines'],
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
