//import { VisVisTypeProvider } from 'ui/vis/vis_type';
import { VislibVisTypeVislibVisTypeProvider } from 'ui/vislib_vis_type/vislib_vis_type';
import { VisSchemasProvider } from 'ui/vis/schemas';
import gaugeTemplate from 'plugins/kbn_vislib_vis_types/editors/gauge.html';
import { vislibColorMaps } from 'ui/vislib/components/color/colormaps';

export default function GaugeVisType(Private) {
  const VislibVisType = Private(VislibVisTypeVislibVisTypeProvider);
  const Schemas = Private(VisSchemasProvider);

  return new VislibVisType({
    name: 'gauge',
    title: 'Gauge chart',
    icon: 'fa-tachometer',
    description: 'A gauge chart shows much more than one value. It gives the minimum, the maximum, ' +
    'the current value and how far from the maximum you are ',
    params: {
      defaults: {
        addTooltip: true,
        addLegend: false,

        gauge: {
          verticalSplit: false,
          autoExtend: false,
          percentageMode: false,
          gaugeType: 'Meter',
          gaugeStyle: 'Full',
          backStyle: 'Full',
          orientation: 'vertical',
          colorSchema: 'Green to Red',
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
            width: 2
          },
          type: 'meter',
          style: {
            bgWidth: 0.9,
            width: 0.9,
            mask: false,
            bgMask: false,
            maskBars: 50,
            bgFill: '#eee',
            subText: '',
          }
        }
      },
      gaugeTypes: ['Meter', 'Circle'],
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
        aggFilter: '!std_dev',
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
