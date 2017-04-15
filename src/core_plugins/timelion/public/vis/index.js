import VisVisTypeProvider from 'ui/vis/vis_type';
import image from '../images/icon-timelion.svg';

define(function (require) {
  // we also need to load the controller and used by the template
  require('plugins/timelion/vis/timelion_vis_controller');
  require('plugins/timelion/vis/timelion_vis_params_controller');

  // Stylin
  require('plugins/timelion/vis/timelion_vis.less');

  // register the provider with the visTypes registry so that other know it exists
  require('ui/registry/vis_types').register(TimelionVisProvider);

  function TimelionVisProvider(Private) {
    const VisType = Private(VisVisTypeProvider);
    const TemplateVisType = Private(require('ui/template_vis_type'));

    // return the visType object, which kibana will use to display and configure new
    // Vis object of this type.
    return new TemplateVisType({
      name: 'timelion',
      title: 'Timelion',
      image,
      description: 'Build time-series using functional expressions',
      category: VisType.CATEGORY.TIME,
      template: require('plugins/timelion/vis/timelion_vis.html'),
      params: {
        editor: require('plugins/timelion/vis/timelion_vis_params.html')
      },
      requiresSearch: false,
      requiresTimePicker: true,
      implementsRenderComplete: true,
    });
  }

  // export the provider so that the visType can be required with Private()
  return TimelionVisProvider;
});
