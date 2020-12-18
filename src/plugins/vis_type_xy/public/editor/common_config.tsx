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

import React from 'react';
import { i18n } from '@kbn/i18n';

import { VisOptionsProps } from '../../../vis_default_editor/public';

import { VisParams } from '../types';
import { MetricsAxisOptions, PointSeriesOptions } from './components/options';
import { ValidationWrapper } from './components/common';

export function getOptionTabs(showElasticChartsOptions = false) {
  return [
    {
      name: 'advanced',
      title: i18n.translate('visTypeXy.area.tabs.metricsAxesTitle', {
        defaultMessage: 'Metrics & axes',
      }),
      editor: (props: VisOptionsProps<VisParams>) => (
        <ValidationWrapper {...props} component={MetricsAxisOptions} />
      ),
    },
    {
      name: 'options',
      title: i18n.translate('visTypeXy.area.tabs.panelSettingsTitle', {
        defaultMessage: 'Panel settings',
      }),
      editor: (props: VisOptionsProps<VisParams>) => (
        <ValidationWrapper
          {...props}
          extraProps={{
            showElasticChartsOptions,
          }}
          component={PointSeriesOptions}
        />
      ),
    },
  ];
}
