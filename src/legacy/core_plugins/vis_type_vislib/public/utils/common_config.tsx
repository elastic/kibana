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

import { VisOptionsProps } from '../legacy_imports';
import { PointSeriesOptions, MetricsAxisOptions } from '../components/options';
import { ValidationWrapper } from '../components/common';
import { BasicVislibParams } from '../types';

function getAreaOptionTabs() {
  return [
    {
      name: 'advanced',
      title: i18n.translate('kbnVislibVisTypes.area.tabs.metricsAxesTitle', {
        defaultMessage: 'Metrics & axes',
      }),
      editor: (props: VisOptionsProps<BasicVislibParams>) => (
        <ValidationWrapper {...props} component={MetricsAxisOptions} />
      ),
    },
    {
      name: 'options',
      title: i18n.translate('kbnVislibVisTypes.area.tabs.panelSettingsTitle', {
        defaultMessage: 'Panel settings',
      }),
      editor: (props: VisOptionsProps<BasicVislibParams>) => (
        <ValidationWrapper {...props} component={PointSeriesOptions} />
      ),
    },
  ];
}

const countLabel = i18n.translate('kbnVislibVisTypes.area.countText', {
  defaultMessage: 'Count',
});

export { getAreaOptionTabs, countLabel };
