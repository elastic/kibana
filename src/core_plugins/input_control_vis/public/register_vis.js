import './vis.less';
import { CATEGORY } from 'ui/vis/vis_category';
import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { VisController } from './vis_controller';
import { ControlsTab } from './components/editor/controls_tab';
import { OptionsTab } from './components/editor/options_tab';
import { defaultFeedbackMessage } from 'ui/vis/default_feedback_message';
import image from './images/icon-input-control.svg';
import { Status } from 'ui/vis/update_status';

function InputControlVisProvider(Private) {
  const VisFactory = Private(VisFactoryProvider);

  // return the visType object, which kibana will use to display and configure new Vis object of this type.
  return VisFactory.createBaseVisualization({
    name: 'input_control_vis',
    title: 'Controls',
    image,
    description: 'Create interactive controls for easy dashboard manipulation.',
    category: CATEGORY.OTHER,
    stage: 'lab',
    requiresUpdateStatus: [Status.PARAMS, Status.TIME],
    feedbackMessage: defaultFeedbackMessage,
    visualization: VisController,
    visConfig: {
      defaults: {
        controls: [],
        updateFiltersOnChange: false,
        useTimeFilter: false,
        pinFilters: false,
      },
    },
    editor: 'default',
    editorConfig: {
      optionTabs: [
        {
          name: 'controls',
          title: 'Controls',
          editor: ControlsTab
        },
        {
          name: 'options',
          title: 'Options',
          editor: OptionsTab
        }
      ]
    },
    requestHandler: 'none',
    responseHandler: 'none',
  });
}

// register the provider with the visTypes registry
VisTypesRegistryProvider.register(InputControlVisProvider);

// export the provider so that the visType can be required with Private()
export default InputControlVisProvider;
