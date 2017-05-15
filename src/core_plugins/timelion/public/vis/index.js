import { VisVisTypeProvider } from 'ui/vis/vis_type';
import image from '../images/icon-timelion.svg';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { RequestHandlersRegistryProvider } from 'ui/registry/request_handlers';
import { AngularVisTypeProvider } from 'ui/vis/vis_types/angular_vis_type';
import { TimelionRequestHandlerProvider } from './timelion_request_handler';

define(function (require) {
  // we also need to load the controller and used by the template
  require('plugins/timelion/vis/timelion_vis_controller');
  require('plugins/timelion/directives/expression_directive');

  // Stylin
  require('plugins/timelion/vis/timelion_vis.less');

  // register the provider with the visTypes registry so that other know it exists
  VisTypesRegistryProvider.register(TimelionVisProvider);
  RequestHandlersRegistryProvider.register(TimelionRequestHandlerProvider);

  function TimelionVisProvider(Private) {
    const VisType = Private(VisVisTypeProvider);
    const AngularVisType = Private(AngularVisTypeProvider);

    // return the visType object, which kibana will use to display and configure new
    // Vis object of this type.
    return new AngularVisType({
      name: 'timelion',
      title: 'Timelion',
      image,
      description: 'Build time-series using functional expressions',
      category: VisType.CATEGORY.TIME,
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
