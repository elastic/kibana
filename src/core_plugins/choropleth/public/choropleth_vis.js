import 'plugins/choropleth/choropleth.less';
import 'plugins/choropleth/choropleth_controller';
import 'plugins/choropleth/choropleth_vis_params';
import TemplateVisTypeTemplateVisTypeProvider from 'ui/template_vis_type/template_vis_type';
import VisSchemasProvider from 'ui/vis/schemas';
import choroplethTemplate from 'plugins/choropleth/choropleth_controller.html';
import visTypes from 'ui/registry/vis_types';
import colorramps from 'ui/vislib/components/color/colormaps';

visTypes.register(function ChoroplethProvider(Private, vectormapsConfig) {

  const TemplateVisType = Private(TemplateVisTypeTemplateVisTypeProvider);
  const Schemas = Private(VisSchemasProvider);


  const defaultLayers = [
    {
      type: 'default',
      url: '../plugins/choropleth/data/world_countries.geojson',
      name: 'World Countries',
      fields: [
        {
          name: 'iso',
          description: '2-digit country abbreviation'
        }
      ]
    },
    {
      type: 'default',
      url: '../plugins/choropleth/data/state.geojson',
      name: 'US States',
      fields: [{
        name: 'NAME',
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
      colorSchemas: Object.keys(colorramps),
      vectormap: vectorLayers,
      editor: '<choropleth-vis-params></choropleth-vis-params>'
    },
    schemas: new Schemas([
      {
        group: 'metrics',
        name: 'metric',
        title: '',
        min: 1,
        max: 1,
        aggFilter: ['!std_dev', '!percentiles', '!percentile_ranks'],
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


