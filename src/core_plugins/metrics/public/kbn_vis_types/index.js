import '../visualizations/less/main.less';
import '../less/main.less';
import image from '../images/icon-visualbuilder.svg';
import { MetricsRequestHandlerProvider } from './request_handler';
import { ReactEditorControllerProvider } from './editor_controller';
import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { CATEGORY } from 'ui/vis/vis_category';
import { defaultFeedbackMessage } from 'ui/vis/default_feedback_message';

// register the provider with the visTypes registry so that other know it exists
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
VisTypesRegistryProvider.register(MetricsVisProvider);

export default function MetricsVisProvider(Private) {
  const VisFactory = Private(VisFactoryProvider);
  const ReactEditorController = Private(ReactEditorControllerProvider).handler;
  const metricsRequestHandler = Private(MetricsRequestHandlerProvider).handler;

  return VisFactory.createReactVisualization({
    name: 'metrics',
    title: 'Visual Builder',
    description: 'Build time-series using a visual pipeline interface',
    category: CATEGORY.TIME,
    image,
    stage: 'experimental',
    feedbackMessage: defaultFeedbackMessage,
    visConfig: {
      defaults: {
        id: '61ca57f0-469d-11e7-af02-69e470af7417',
        type: 'timeseries',
        series: [
          {
            id: '61ca57f1-469d-11e7-af02-69e470af7417',
            color: '#68BC00',
            split_mode: 'everything',
            metrics: [
              {
                id: '61ca57f2-469d-11e7-af02-69e470af7417',
                type: 'count'
              }],
            seperate_axis: 0,
            axis_position: 'right',
            formatter: 'number',
            chart_type: 'line',
            line_width: 1,
            point_size: 1,
            fill: 0.5,
            stacked: 'none'
          }],
        time_field: '@timestamp',
        index_pattern: '',
        interval: 'auto',
        axis_position: 'left',
        axis_formatter: 'number',
        show_legend: 1,
        show_grid: 1
      },
      component: require('../components/vis_editor')
    },
    editor: ReactEditorController,
    editorConfig: {
      component: require('../components/vis_editor')
    },
    options: {
      showQueryBar: false,
      showFilterBar: false,
      showIndexSelection: false
    },
    requestHandler: metricsRequestHandler,
    responseHandler: 'none'
  });
}
