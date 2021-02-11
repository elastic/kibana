/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { VisOptionsProps } from 'src/plugins/vis_default_editor/public';
import { PointSeriesOptions, MetricsAxisOptions } from '../components/options';
import { ValidationWrapper } from '../components/common';
import { BasicVislibParams } from '../types';

function getAreaOptionTabs() {
  return [
    {
      name: 'advanced',
      title: i18n.translate('visTypeVislib.area.tabs.metricsAxesTitle', {
        defaultMessage: 'Metrics & axes',
      }),
      editor: (props: VisOptionsProps<BasicVislibParams>) => (
        <ValidationWrapper {...props} component={MetricsAxisOptions} />
      ),
    },
    {
      name: 'options',
      title: i18n.translate('visTypeVislib.area.tabs.panelSettingsTitle', {
        defaultMessage: 'Panel settings',
      }),
      editor: (props: VisOptionsProps<BasicVislibParams>) => (
        <ValidationWrapper {...props} component={PointSeriesOptions} />
      ),
    },
  ];
}

const countLabel = i18n.translate('visTypeVislib.area.countText', {
  defaultMessage: 'Count',
});

export { getAreaOptionTabs, countLabel };
