/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';

import { InspectorViewDescription } from '../../types';
import { Adapters } from '../../../common';

const DataViewComponent = lazy(() => import('./components/data_view'));

export const getDataViewDescription = (): InspectorViewDescription => ({
  title: i18n.translate('inspector.data.dataTitle', {
    defaultMessage: 'Data',
  }),
  order: 10,
  help: i18n.translate('inspector.data.dataDescriptionTooltip', {
    defaultMessage: 'View the data behind the visualization',
  }),
  shouldShow(adapters: Adapters) {
    return Boolean(adapters.data);
  },
  component: DataViewComponent,
});
