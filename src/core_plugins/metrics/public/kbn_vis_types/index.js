import './vis_controller';
import './editor_controller';
import '../visualizations/less/main.less';
import 'react-select/dist/react-select.css';
import '../less/main.less';
import image from '../images/icon-visualbuilder.svg';
import { AngularVisTypeProvider } from 'ui/vis/vis_types/angular_vis_type';

import { CATEGORY } from 'ui/vis/vis_category';
// register the provider with the visTypes registry so that other know it exists
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
VisTypesRegistryProvider.register(MetricsVisProvider);

export default function MetricsVisProvider(Private) {
  const AngularVisType = Private(AngularVisTypeProvider);

  // return the visType object, which kibana will use to display and configure new
  // Vis object of this type.
  return new AngularVisType({
    name: 'metrics',
    title: 'Visual Builder',
    image,
    description: 'Build time-series using a visual pipeline interface',
    category: CATEGORY.TIME,
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
