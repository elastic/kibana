import 'plugins/table_vis/table_vis.less';
import 'plugins/table_vis/table_vis_controller';
import 'plugins/table_vis/table_vis_params';
import 'ui/agg_table';
import 'ui/agg_table/agg_table_group';
import { VisVisTypeProvider } from 'ui/vis/vis_type';
import { TemplateVisTypeProvider } from 'ui/template_vis_type/template_vis_type';
import { VisSchemasProvider } from 'ui/vis/schemas';
import tableVisTemplate from 'plugins/table_vis/table_vis.html';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import image from './images/icon-table.svg';
// we need to load the css ourselves

// we also need to load the controller and used by the template

// our params are a bit complex so we will manage them with a directive

// require the directives that we use as well

// register the provider with the visTypes registry
VisTypesRegistryProvider.register(TableVisTypeProvider);

// define the TableVisType
function TableVisTypeProvider(Private) {
  const VisType = Private(VisVisTypeProvider);
  const TemplateVisType = Private(TemplateVisTypeProvider);
  const Schemas = Private(VisSchemasProvider);

  // define the TableVisController which is used in the template
  // by angular's ng-controller directive

  // return the visType object, which kibana will use to display and configure new
  // Vis object of this type.
  return new TemplateVisType({
    name: 'table',
    title: 'Data Table',
    image,
    description: 'Display values in a table',
    category: VisType.CATEGORY.DATA,
    template: tableVisTemplate,
    params: {
      defaults: {
        perPage: 10,
        showPartialRows: false,
        showMeticsAtAllLevels: false,
        sort: {
          columnIndex: null,
          direction: null
        },
        showTotal: false,
        totalFunc: 'sum'
      },
      editor: '<table-vis-params></table-vis-params>'
    },
    implementsRenderComplete: true,
    hierarchicalData: function (vis) {
      return Boolean(vis.params.showPartialRows || vis.params.showMeticsAtAllLevels);
    },
    schemas: new Schemas([
      {
        group: 'metrics',
        name: 'metric',
        title: 'Metric',
        aggFilter: '!geo_centroid',
        min: 1,
        defaults: [
          { type: 'count', schema: 'metric' }
        ]
      },
      {
        group: 'buckets',
        name: 'bucket',
        title: 'Split Rows'
      },
      {
        group: 'buckets',
        name: 'split',
        title: 'Split Table'
      }
    ])
  });
}

export default TableVisTypeProvider;
