import 'plugins/countdown/countdown.less';
import { CATEGORY } from 'ui/vis/vis_category';
import { visComponent } from 'plugins/countdown/vis_component';
import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { VisSchemasProvider } from 'ui/vis/editors/default/schemas';
import optionsTemplate from 'plugins/countdown/options_template.html';
import { requestHandler } from 'plugins/countdown/request_handler';
import { responseHandler } from 'plugins/countdown/response_handler';

function CountdownProvider(Private) {
  const VisFactory = Private(VisFactoryProvider);
  const Schemas = Private(VisSchemasProvider);

  // return the visType object, which kibana will use to display and configure new Vis object of this type.
  return VisFactory.createReactVisualization({
    name: 'countdown',
    title: 'Countdown',
    icon: 'fa fa-gear',
    description: 'Display the time remaining until a specific date and time.',
    category: CATEGORY.OTHER,
    visConfig: {
      defaults: {
        // add default parameters
        fontSize: '50'
      },
      component: visComponent,
    },
    editor: 'default',
    editorConfig: {
      optionsTemplate: optionsTemplate,
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: 'Metric',
          min: 1,
          aggFilter: ['!derivative', '!geo_centroid'],
          defaults: [
            { type: 'count', schema: 'metric' }
          ]
        }
      ]),
    },
    requestHandler: requestHandler,
    responseHandler: responseHandler,
  });
}

// register the provider with the visTypes registry
VisTypesRegistryProvider.register(CountdownProvider);

// export the provider so that the visType can be required with Private()
export default CountdownProvider;
