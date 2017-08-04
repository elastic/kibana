import './input_control_vis.less';
import 'react-select/dist/react-select.css';
import { CATEGORY } from 'ui/vis/vis_category';
import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { VisController } from './vis_controller';
import { newControl } from './lib/editor_utils';
import { InputControlVisEditor } from './components/input_control_vis_editor';

function TermsVisProvider(Private) {
  const VisFactory = Private(VisFactoryProvider);

  // return the visType object, which kibana will use to display and configure new Vis object of this type.
  return VisFactory.createBaseVisualization({
    name: 'input_control_vis',
    title: 'Dashboard Controls',
    icon: 'fa fa-gear',
    description: 'Create interactive controls for easy Dashboard manipulation.',
    category: CATEGORY.OTHER,
    visualization: VisController,
    visConfig: {
      defaults: {
        controls: [newControl()]
      },
    },
    editor: 'default',
    editorConfig: {
      optionsTemplate: InputControlVisEditor
    },
    requestHandler: 'none',
    responseHandler: 'none',
  });
}

// register the provider with the visTypes registry
VisTypesRegistryProvider.register(TermsVisProvider);

// export the provider so that the visType can be required with Private()
export default TermsVisProvider;
