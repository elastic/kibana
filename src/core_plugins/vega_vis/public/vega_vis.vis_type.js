import { VisTypesRegistryProvider } from 'ui/registry/vis_types';

import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { CATEGORY } from 'ui/vis/vis_category';

import { VegaEditorProvider } from './vega_vis_editor';
import { VegaRequestHandlerProvider } from './vega_request_handler';
import './vega_vis.directive';
import './vega_vis_editor.less';

import defaultSpec from '!!raw-loader!./default.spec.json';

// register the provider with the visTypes registry
VisTypesRegistryProvider.register(function VegaVisProvider(Private) {
  const VisFactory = Private(VisFactoryProvider);
  const VegaEditor = Private(VegaEditorProvider);
  const vegaRequestHandler = Private(VegaRequestHandlerProvider).handler;

  // return the visType object, which kibana will use to display and configure new
  // Vis object of this type.
  return VisFactory.createAngularVisualization({
    name: 'vega',
    title: 'Vega Vis',
    description: 'Build Vega and VegaLite data visualizations into Kibana',
    icon: 'fa-code',
    category: CATEGORY.OTHER,
    visConfig: {
      template: `<vega-vis vis="vis"></vega-vis>`,
      defaults: {
        spec: defaultSpec
      }
    },
    editor: VegaEditor,
    requestHandler: vegaRequestHandler,
    responseHandler: 'none',
    requiresSearch: false,
    isExperimental: true,
  });
});
