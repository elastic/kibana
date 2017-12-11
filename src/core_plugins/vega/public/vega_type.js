import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { CATEGORY } from 'ui/vis/vis_category';

import { VegaVisualizationProvider } from './vega_visualization';
import { VegaRequestHandlerProvider } from './vega_request_handler';

import './vega.less';
import './vega_editor.less';
import vegaVisTemplate from './vega_editor.template.html';
import defaultSpec from '!!raw-loader!./default.spec.json';

VisTypesRegistryProvider.register((Private) => {
  const VisFactory = Private(VisFactoryProvider);
  const vegaRequestHandler = Private(VegaRequestHandlerProvider).handler;
  const VegaVisualization = Private(VegaVisualizationProvider);

  return VisFactory.createBaseVisualization({
    name: 'vegavis',
    title: 'Vega',
    description: 'Create custom visualizations using Vega and VegaLite',
    icon: 'fa-code',
    category: CATEGORY.OTHER,
    visConfig: { defaults: { spec: defaultSpec } },
    editorController: 'default',
    editorConfig: { optionsTemplate: vegaVisTemplate },
    visualization: VegaVisualization,
    requestHandler: vegaRequestHandler,
    responseHandler: 'none',
    options: { showIndexSelection: false },
    stage: 'lab',
  });
});
