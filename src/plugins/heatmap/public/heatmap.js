import 'plugins/heatmap/heatmap.less';
import 'plugins/heatmap/color_directive.js';
import 'plugins/heatmap/lib/heatmap_controller.js';
import 'plugins/heatmap/lib/heatmap_directive.js';
import colors from 'plugins/heatmap/colors.js';
import TemplateVisTypeProvider from 'ui/template_vis_type/template_vis_type';
import VisSchemasProvider from 'ui/vis/schemas';
import heatmapTemplate from 'plugins/heatmap/heatmap.html';
import heatmapVisParamsTemplate from 'plugins/heatmap/heatmap_vis_params.html';

// register the provider with the visTypes registry
require('ui/registry/vis_types').register(HeatmapProvider);

function HeatmapProvider(Private) {
  const TemplateVisType = Private(TemplateVisTypeProvider);
  const Schemas = Private(VisSchemasProvider);

  return new TemplateVisType({
    name: 'heatmap',
    title: 'Heatmap',
    description: 'A heat map is a graphical representation of data where the individual ' +
      'values contained in a matrix are represented as colors.',
    icon: 'fa-th',
    template: heatmapTemplate,
    params: {
      defaults: {
        margin: { top: 20, right: 200, bottom: 100, left: 100 },
        stroke: '#ffffff',
        strokeWidth: 1,
        padding: 0,
        legendNumberFormat: 'number',
        color: colors[0].name,
        numberOfColors: 6,
        rowAxis: { filterBy: 0 },
        columnAxis: { filterBy: 0 }
      },
      colors: colors,
      legendNumberFormats: ['number', 'bytes', 'currency', 'percentage'],
      editor: heatmapVisParamsTemplate
    },
    schemas: new Schemas([
      {
        group: 'metrics',
        name: 'metric',
        title: 'Cell',
        min: 1,
        aggFilter: ['avg', 'sum', 'count', 'min', 'max', 'median', 'cardinality'],
        defaults: [
          { schema: 'metric', type: 'count' }
        ]
      },
      {
        group: 'buckets',
        name: 'columns',
        icon: 'fa fa-ellipsis-v',
        title: 'Columns',
        min: 0,
        max: 1,
        aggFilter: '!geohash_grid'
      },
      {
        group: 'buckets',
        name: 'rows',
        icon: 'fa fa-ellipsis-h',
        title: 'Rows',
        min: 0,
        max: 1,
        aggFilter: '!geohash_grid'
      }
    ])
  });
}

export default HeatmapProvider;
