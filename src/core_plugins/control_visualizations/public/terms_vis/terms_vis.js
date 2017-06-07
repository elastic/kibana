import './terms_vis.less';
import 'react-select/dist/react-select.css';
import { CATEGORY } from 'ui/vis/vis_category';
import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { VisController } from './vis_controller';
import { newField } from './lib/editor_utils';
import { Simple } from './components/simple';

function TermsVisProvider(Private) {
  const VisFactory = Private(VisFactoryProvider);

  // return the visType object, which kibana will use to display and configure new Vis object of this type.
  return VisFactory.createBaseVisualization({
    name: 'terms_vis',
    title: 'Terms Control',
    icon: 'fa fa-gear',
    description: 'Terms Control',
    category: CATEGORY.CONTROL,
    visualization: VisController,
    visConfig: {
      defaults: {
        param1: 'default value',
        fields: [newField()]
      },
    },
    editor: 'default',
    editorConfig: {
      optionsTemplate: Simple
    },
    requestHandler: 'none',
    responseHandler: 'none',
  });
}

// register the provider with the visTypes registry
VisTypesRegistryProvider.register(TermsVisProvider);

// export the provider so that the visType can be required with Private()
export default TermsVisProvider;
