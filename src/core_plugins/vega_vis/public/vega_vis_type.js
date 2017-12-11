import { VisTypesRegistryProvider } from 'ui/registry/vis_types';

import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { CATEGORY } from 'ui/vis/vis_category';

// import { VegaEditorProvider } from './vega_vis_editor';
import { VegaVisualization } from './vega_visualization';
// import { VegaRequestHandlerProvider } from './vega_request_handler';
// import './vega_vis.directive';
import './vega_vis_editor.less';

import vegaVisTemplate from 'plugins/vega_vis/vega_vis_editor.template.html';
import { dashboardContextProvider } from 'plugins/kibana/dashboard/dashboard_context';

import defaultSpec from '!!raw-loader!./default.spec.json';
import { VegaParser } from './vega_view';

// register the provider with the visTypes registry
VisTypesRegistryProvider.register(function VegaVisProvider(Private, es, timefilter, serviceSettings, vegaConfig) {
  const VisFactory = Private(VisFactoryProvider);
  // const VegaEditor = Private(VegaEditorProvider);
  // const vegaRequestHandler = Private(VegaRequestHandlerProvider).handler;
  const dashboardContext = Private(dashboardContextProvider);

  // return the visType object, which kibana will use to display and configure new
  // Vis object of this type.
  return VisFactory.createBaseVisualization({
    name: 'vegavis',
    title: 'Vega',
    description: 'Create custom visualizations using Vega and VegaLite',
    icon: 'fa-code',
    category: CATEGORY.OTHER,
    visConfig: {
      // template: `<vega-vis vis="vis"></vega-vis>`,
      defaults: {
        spec: defaultSpec
      }
    },
    editorController: 'default',
    editorConfig: { optionsTemplate: vegaVisTemplate },
    visualization: VegaVisualization,

    // requestHandler: vegaRequestHandler,
    requestHandler: (vis/*, appState, uiState*/) => {
      const vp = new VegaParser(vis.params.spec, es, timefilter, dashboardContext,
        { serviceSettings, vegaConfig });
      return vp.parseAsync();

    },

    responseHandler: 'none',
    options: {
      showIndexSelection: false,
    },
    stage: 'lab',
  });
});
