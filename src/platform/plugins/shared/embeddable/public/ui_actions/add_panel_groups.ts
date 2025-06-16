/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const ADD_PANEL_VISUALIZATION_GROUP = {
  id: 'visualizations',
  getDisplayName: () =>
    i18n.translate('embeddableApi.common.constants.grouping.visualizations', {
      defaultMessage: 'Visualizations',
    }),
  getIconType: () => {
    return 'visGauge';
  },
  order: 1000,
};

export const ADD_PANEL_ANNOTATION_GROUP = {
  id: 'annotation-and-navigation',
  getDisplayName: () =>
    i18n.translate('embeddableApi.common.constants.grouping.annotations', {
      defaultMessage: 'Annotations and Navigation',
    }),
  order: 900, // This is the order of the group in the context menu
};

export const ADD_PANEL_OTHER_GROUP = {
  id: 'other',
  getDisplayName: () =>
    i18n.translate('embeddableApi.common.constants.grouping.other', {
      defaultMessage: 'Other',
    }),
  getIconType: () => 'empty',
  order: -1, // Given an item that doesn't specify a group is assigned zero, this forces other to come after all intentionally grouped section
};
