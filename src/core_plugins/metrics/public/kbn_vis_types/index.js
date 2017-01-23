import './vis_controller';
import './editor_controller';
import '../visualizations/less/main.less';
import 'react-select/dist/react-select.css';
import '../less/main.less';

  // register the provider with the visTypes registry so that other know it exists
import visTypes from 'ui/registry/vis_types';
visTypes.register(MetricsVisProvider);

export default function MetricsVisProvider(Private) {
  const TemplateVisType = Private(require('ui/template_vis_type'));

  // return the visType object, which kibana will use to display and configure new
  // Vis object of this type.
  return new TemplateVisType({
    name: 'metrics',
    title: 'Timeseries: Visual Builder',
    icon: 'fa-area-chart',
    description: `Create a time series based visualization for metrics. Perfect
        for creating visualizations for time series based metrics using the
        powerful pipeline aggs Elasticsearch feature`,
    template: require('./vis.html'),
    params: {
      editor: require('./editor.html')
    },
    requiresSearch: false,
    implementsRenderComplete: true,
  });
}
