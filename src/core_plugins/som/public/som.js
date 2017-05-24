import 'plugins/som/som.less';
import { CATEGORY } from 'ui/vis/vis_category';
import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { VisSchemasProvider } from 'ui/vis/editors/default/schemas';
import optionsTemplate from 'plugins/som/options_template.html';
import { SomVisualization } from './som_visualization';

function SomProvider(Private) {
  const VisFactory = Private(VisFactoryProvider);
  const Schemas = Private(VisSchemasProvider);

  return VisFactory.createBaseVisualization({
    name: 'som',
    title: 'Self Organizing Map',
    icon: 'fa fa-gear',
    description: 'foobar',
    category: CATEGORY.OTHER,
    visualization: SomVisualization,
    visConfig: {
      defaults: {}
    },
    editor: 'default',
    editorConfig: {
      optionsTemplate: optionsTemplate,
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: 'Metric',
          aggFilter: ['sum', 'min', 'max', 'count']
        },
        {
          group: 'buckets',
          name: 'bucket',
          icon: 'fa fa-map-o',
          title: 'Tags',
          min: 1,
          aggFilter: ['terms', 'significant_terms']
        }
      ])
    },
    requestHandler: 'courier',
    responseHandler: 'basic'
  });
}

// register the provider with the visTypes registry
VisTypesRegistryProvider.register(SomProvider);

// export the provider so that the visType can be required with Private()
export default SomProvider;
