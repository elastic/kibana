import 'plugins/choropleth/choropleth.less';
import 'plugins/choropleth/choropleth_controller';
import 'plugins/choropleth/choropleth_vis_params';
import { TemplateVisTypeProvider } from 'ui/template_vis_type/template_vis_type';
import { VisSchemasProvider } from 'ui/vis/schemas';
import choroplethTemplate from 'plugins/choropleth/choropleth_controller.html';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { VisVisTypeProvider } from 'ui/vis/vis_type';
import { truncatedColorMaps } from 'ui/vislib/components/color/truncated_colormaps';

VisTypesRegistryProvider.register(function ChoroplethProvider(Private, vectormapsConfig) {

  const VisType = Private(VisVisTypeProvider);
  const TemplateVisType = Private(TemplateVisTypeProvider);
  const Schemas = Private(VisSchemasProvider);

  const defaultLayers = [
    {
      type: 'default',
      url: '../plugins/choropleth/data/world_countries.json',
      name: 'World Countries',
      fields: [
        {
          name: 'iso2',
          description: 'Two letter abbreviation'
        },
        {
          name: 'iso3',
          description: 'Three letter abbreviation'
        },
        {
          name: 'name',
          description: 'Country name'
        }
      ]
    },
    {
      type: 'default',
      url: '../plugins/choropleth/data/us_states.json',
      name: 'US States',
      fields: [{
        name: 'postal',
        description: 'Two letter abbreviation'
      }, {
        name: 'name',
        description: 'State name'
      }]
    }
  ];

  const vectorLayers = vectormapsConfig.layers.concat(defaultLayers);
  return new TemplateVisType({
    name: 'choropleth',
    title: 'Vector Map',
    implementsRenderComplete: true,
    description: 'Show metrics on a thematic map. Use one of the provide base maps, or add your own. ' +
    'Darker colors represent higher values.',
    category: VisType.CATEGORY.MAP,
    icon: 'fa-globe',
    template: choroplethTemplate,
    params: {
      defaults: {
        legendPosition: 'bottomright',
        addTooltip: true,
        colorSchema: 'Yellow to Red',
        selectedLayer: vectorLayers[0],
        selectedJoinField: vectorLayers[0].fields[0]
      },
      legendPositions: [{
        value: 'bottomleft',
        text: 'bottom left',
      }, {
        value: 'bottomright',
        text: 'bottom right',
      }, {
        value: 'topleft',
        text: 'top left',
      }, {
        value: 'topright',
        text: 'top right',
      }],
      colorSchemas: Object.keys(truncatedColorMaps),
      vectormap: vectorLayers,
      editor: '<choropleth-vis-params></choropleth-vis-params>'
    },
    schemas: new Schemas([
      {
        group: 'metrics',
        name: 'metric',
        title: 'Value',
        min: 1,
        max: 1,
        aggFilter: ['count', 'avg', 'sum', 'min', 'max', 'cardinality', 'top_hits'],
        defaults: [
          { schema: 'metric', type: 'count' }
        ]
      },
      {
        group: 'buckets',
        name: 'segment',
        icon: 'fa fa-globe',
        title: 'shape field',
        min: 1,
        max: 1,
        aggFilter: ['terms']
      }
    ])
  });
});


