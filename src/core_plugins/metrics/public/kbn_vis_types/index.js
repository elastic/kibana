import '../visualizations/less/main.less';
import 'react-select/dist/react-select.css';
import '../less/main.less';
import image from '../images/icon-visualbuilder.svg';
import { ReactEditorController } from './editor_controller';
import { MetricsRequestHandlerProvider } from './request_handler';
import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { CATEGORY } from 'ui/vis/vis_category';

// register the provider with the visTypes registry so that other know it exists
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
VisTypesRegistryProvider.register(MetricsVisProvider);

export default function MetricsVisProvider(Private) {
  const VisFactory = Private(VisFactoryProvider);
  const metricsRequestHandler = Private(MetricsRequestHandlerProvider).handler;

  return VisFactory.createVislibVisualization({
    name: 'metrics',
    title: 'Visual Builder',
    description: 'Build time-series using a visual pipeline interface',
    category: CATEGORY.TIME,
    image,
    isExperimental: true,
    visConfig: {
      defaults: {

      },
      component: require('../components/visualization')
    },
    editor: ReactEditorController,
    editorConfig: {
      component: require('../components/vis_editor')
    },
    requestHandler: metricsRequestHandler
  });
}
