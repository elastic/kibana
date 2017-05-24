import './state_tracker.less';
import { CATEGORY } from 'ui/vis/vis_category';
import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { VisController } from './vis_controller';
import { EditorController } from './editor_controller';

function StateTracker2Provider(Private) {
  const VisFactory = Private(VisFactoryProvider);

  // return the visType object, which kibana will use to display and configure new Vis object of this type.
  return VisFactory.createBaseVisualization({
    name: 'state_tracker',
    title: 'State Tracker',
    icon: 'fa fa-gear',
    description: 'foobar',
    category: CATEGORY.OTHER,
    visualization: VisController,
    visConfig: {
      defaults: {
        // add default parameters
        fontSize: '50'
      },
    },
    editor: EditorController,
    editorConfig: {},
    requestHandler: (x) => {
      return new Promise(function (resolve) {
        resolve(x);
      });
    },
    responseHandler: 'none',
  });
}

// register the provider with the visTypes registry
VisTypesRegistryProvider.register(StateTracker2Provider);

// export the provider so that the visType can be required with Private()
export default StateTracker2Provider;
