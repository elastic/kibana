/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { i18n } from '@kbn/i18n';
// @ts-ignore
import { defaultFeedbackMessage } from 'ui/vis/default_feedback_message';

// @ts-ignore
import { metricsRequestHandler } from './request_handler';
// @ts-ignore
import { EditorController } from './editor_controller';
// @ts-ignore
import { PANEL_TYPES } from '../common/panel_types';

export const metricsVisDefinition = {
  name: 'metrics',
  title: i18n.translate('visTypeTimeseries.kbnVisTypes.metricsTitle', { defaultMessage: 'TSVB' }),
  description: i18n.translate('visTypeTimeseries.kbnVisTypes.metricsDescription', {
    defaultMessage: 'Build time-series using a visual pipeline interface',
  }),
  icon: 'visVisualBuilder',
  feedbackMessage: defaultFeedbackMessage,
  visConfig: {
    defaults: {
      id: '61ca57f0-469d-11e7-af02-69e470af7417',
      type: PANEL_TYPES.TIMESERIES,
      series: [
        {
          id: '61ca57f1-469d-11e7-af02-69e470af7417',
          color: '#68BC00',
          split_mode: 'everything',
          metrics: [
            {
              id: '61ca57f2-469d-11e7-af02-69e470af7417',
              type: 'count',
            },
          ],
          separate_axis: 0,
          axis_position: 'right',
          formatter: 'number',
          chart_type: 'line',
          line_width: 1,
          point_size: 1,
          fill: 0.5,
          stacked: 'none',
        },
      ],
      time_field: '',
      index_pattern: '',
      interval: '',
      axis_position: 'left',
      axis_formatter: 'number',
      axis_scale: 'normal',
      show_legend: 1,
      show_grid: 1,
    },
    component: require('./components/vis_editor').VisEditor,
  },
  editor: EditorController,
  editorConfig: {
    component: require('./components/vis_editor').VisEditor,
  },
  options: {
    showQueryBar: false,
    showFilterBar: false,
    showIndexSelection: false,
  },
  requestHandler: metricsRequestHandler,
  responseHandler: 'none',
};
