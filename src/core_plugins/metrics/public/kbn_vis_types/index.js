import './vis_controller';
import './editor_controller';
import '../visualizations/less/main.less';
import 'react-select/dist/react-select.css';
import '../less/main.less';
import image from '../images/icon-visualbuilder.svg';
import { TemplateVisTypeProvider } from 'ui/template_vis_type';

import { VisVisTypeProvider } from 'ui/vis/vis_type';
// register the provider with the visTypes registry so that other know it exists
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
VisTypesRegistryProvider.register(MetricsVisProvider);

export default function MetricsVisProvider(Private) {
  const VisType = Private(VisVisTypeProvider);
  const TemplateVisType = Private(TemplateVisTypeProvider);

  // return the visType object, which kibana will use to display and configure new
  // Vis object of this type.
  return new TemplateVisType({
    name: 'metrics',
    title: 'Visual Builder',
    image,
    description: 'Build time-series using a visual pipeline interface',
    category: VisType.CATEGORY.TIME,
    isExperimental: true,
    template: require('./vis.html'),
    fullEditor: true,
    params: {
      editor: require('./editor.html')
    },
    requiresSearch: false,
    requiresTimePicker: true,
    implementsRenderComplete: true,
  });
}
