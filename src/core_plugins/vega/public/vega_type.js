import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { CATEGORY } from 'ui/vis/vis_category';

import { VegaRequestHandlerProvider } from './vega_request_handler';
import { VegaVisualizationProvider } from './vega_visualization';

import './vega.less';

// Editor-specific code
import 'brace/mode/hjson';
import './vega_editor.less';
import './vega_editor.controller';
import vegaEditorTemplate from './vega_editor.template.html';
import defaultSpec from '!!raw-loader!./default.spec.hjson';

VisTypesRegistryProvider.register((Private) => {
  const VisFactory = Private(VisFactoryProvider);
  const vegaRequestHandler = Private(VegaRequestHandlerProvider).handler;
  const VegaVisualization = Private(VegaVisualizationProvider);

  return VisFactory.createBaseVisualization({
    name: 'vega',
    title: 'Vega',
    description: 'Create custom visualizations using Vega and VegaLite',
    icon: 'fa-code',
    category: CATEGORY.OTHER,
    visConfig: { defaults: { spec: defaultSpec } },
    editorController: 'default',
    editorConfig: { optionsTemplate: vegaEditorTemplate, enableAutoApply: true },
    visualization: VegaVisualization,
    requestHandler: vegaRequestHandler,
    responseHandler: 'none',
    options: { showIndexSelection: false },
    stage: 'lab',
  });
});
