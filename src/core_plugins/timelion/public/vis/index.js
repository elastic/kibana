import { VisVisTypeProvider } from 'ui/vis/vis_type';
import image from '../images/icon-timelion.svg';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { TemplateVisTypeProvider } from 'ui/template_vis_type';
import template from 'plugins/timelion/vis/timelion_vis.html';
import editorTemplate from 'plugins/timelion/vis/timelion_vis_params.html';
import 'plugins/timelion/vis/timelion_vis_controller';
import 'plugins/timelion/vis/timelion_vis_params_controller';
import 'plugins/timelion/vis/timelion_vis.less';

// export the provider so that the visType can be required with Private()
export default function TimelionVisProvider(Private) {
  const VisType = Private(VisVisTypeProvider);
  const TemplateVisType = Private(TemplateVisTypeProvider);

  // return the visType object, which kibana will use to display and configure new
  // Vis object of this type.
  return new TemplateVisType({
    name: 'timelion',
    title: 'Timelion',
    image,
    description: 'Build time-series using functional expressions',
    category: VisType.CATEGORY.TIME,
    template,
    params: {
      editor: editorTemplate,
    },
    requiresSearch: false,
    requiresTimePicker: true,
    implementsRenderComplete: true,
  });
}

// register the provider with the visTypes registry so that other know it exists
VisTypesRegistryProvider.register(TimelionVisProvider);
