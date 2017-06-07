import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { CATEGORY } from 'ui/vis/vis_category';
import image from '../images/icon-timelion.svg';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { VisRequestHandlersRegistryProvider } from 'ui/registry/vis_request_handlers';
import { TimelionRequestHandlerProvider } from './timelion_request_handler';

define(function (require) {
  // we also need to load the controller and directive used by the template
  require('plugins/timelion/vis/timelion_vis_controller');
  require('plugins/timelion/directives/timelion_expression_input');

  // Stylin
  require('plugins/timelion/vis/timelion_vis.less');

  // register the provider with the visTypes registry so that other know it exists
  VisTypesRegistryProvider.register(TimelionVisProvider);
  VisRequestHandlersRegistryProvider.register(TimelionRequestHandlerProvider);

  function TimelionVisProvider(Private) {
    const VisFactory = Private(VisFactoryProvider);

    // return the visType object, which kibana will use to display and configure new
    // Vis object of this type.
    return VisFactory.createAngularVisualization({
      name: 'timelion',
      title: 'Timelion',
      image,
      description: 'Build time-series using functional expressions',
      category: CATEGORY.TIME,
      visConfig: {
        defaults: {
          expression: '.es(*)',
          interval: '1m'
        },
        template: require('plugins/timelion/vis/timelion_vis.html'),
      },
      editorConfig: {
        optionsTemplate: require('plugins/timelion/vis/timelion_vis_params.html')
      },
      requestHandler: 'timelion',
      responseHandler: 'none',
    });
  }

  // export the provider so that the visType can be required with Private()
  return TimelionVisProvider;
});
