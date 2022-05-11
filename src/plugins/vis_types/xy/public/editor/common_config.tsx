/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import type { VisEditorOptionsProps } from '@kbn/visualizations-plugin/public';

import type { VisParams } from '../types';
import { MetricsAxisOptions, PointSeriesOptions } from './components/options';
import { ValidationWrapper } from './components/common/validation_wrapper';

export const optionTabs = [
  {
    name: 'advanced',
    title: i18n.translate('visTypeXy.area.tabs.metricsAxesTitle', {
      defaultMessage: 'Metrics & axes',
    }),
    editor: (props: VisEditorOptionsProps<VisParams>) => (
      <ValidationWrapper {...props} component={MetricsAxisOptions} />
    ),
  },
  {
    name: 'options',
    title: i18n.translate('visTypeXy.area.tabs.panelSettingsTitle', {
      defaultMessage: 'Panel settings',
    }),
    editor: (props: VisEditorOptionsProps<VisParams>) => (
      <ValidationWrapper {...props} component={PointSeriesOptions} />
    ),
  },
];
