import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { CATEGORY } from 'ui/vis/vis_category';
import { DefaultEditorSize } from 'ui/vis/editor_size';
import { Status } from 'ui/vis/update_status';
import { defaultFeedbackMessage } from 'ui/vis/default_feedback_message';

import { VegaRequestHandlerProvider } from './vega_request_handler';
import { VegaVisualizationProvider } from './vega_visualization';

import './vega.less';

// Editor-specific code
import 'brace/mode/hjson';
import 'brace/ext/searchbox';
import './vega_editor.less';
import './vega_editor_controller';
import vegaEditorTemplate from './vega_editor_template.html';
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
    editorConfig: {
      optionsTemplate: vegaEditorTemplate,
      enableAutoApply: true,
      defaultSize: DefaultEditorSize.MEDIUM,
    },
    visualization: VegaVisualization,
    requiresUpdateStatus: [Status.DATA, Status.RESIZE],
    requestHandler: vegaRequestHandler,
    responseHandler: 'none',
    options: {
      showIndexSelection: false,
      showQueryBar: false,
      showFilterBar: false,
    },
    stage: 'lab',
    feedbackMessage: defaultFeedbackMessage,
  });
});
