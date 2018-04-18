import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { CATEGORY } from 'ui/vis/vis_category';
import image from '../images/icon-timelion.svg';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { TimelionRequestHandlerProvider } from './timelion_request_handler';
import { DefaultEditorSize } from 'ui/vis/editor_size';

// we also need to load the controller and directive used by the template
import './timelion_vis_controller';
import '../directives/timelion_expression_input';

// Stylin
import './timelion_vis.less';

import visConfigTemplate from './timelion_vis.html';
import editorConfigTemplate from './timelion_vis_params.html';

// register the provider with the visTypes registry so that other know it exists
VisTypesRegistryProvider.register(TimelionVisProvider);

export default function TimelionVisProvider(Private) {
  const VisFactory = Private(VisFactoryProvider);
  const timelionRequestHandler = Private(TimelionRequestHandlerProvider);

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
        interval: 'auto'
      },
      template: visConfigTemplate,
    },
    editorConfig: {
      optionsTemplate: editorConfigTemplate,
      defaultSize: DefaultEditorSize.MEDIUM,
    },
    requestHandler: timelionRequestHandler.handler,
    responseHandler: 'none',
    options: {
      showIndexSelection: false,
      showQueryBar: false,
      showFilterBar: false,
    }
  });
}
