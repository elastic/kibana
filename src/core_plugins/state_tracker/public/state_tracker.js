import {VisFactoryProvider} from 'ui/vis/vis_factory';
import {CATEGORY} from 'ui/vis/vis_category';
import {VisTypesRegistryProvider} from 'ui/registry/vis_types';
import {StateVisualization} from './state_visualization';
import { VisSchemasProvider } from 'ui/vis/editors/default/schemas';

VisTypesRegistryProvider.register(function StateTrackerProvider(Private) {

  const VisFactory = Private(VisFactoryProvider);
  const Schemas = Private(VisSchemasProvider);



  return VisFactory.createBaseVisualization({
    name: 'state_tracker',
    title: 'State Tracker',
    icon: 'fa fa-gear',
    description: 'foobar',
    category: CATEGORY.OTHER,
    visConfig: {
    },

    implementsRenderComplete: true,
    visualization: StateVisualization,
    requiresSearch: false,

    requestHandler: 'none',
    responseHandler: 'none',
    editor: DummyEditor,
    editorConfig: {
      //make this dummy
      schemas: new Schemas([])
    }
  });
});


