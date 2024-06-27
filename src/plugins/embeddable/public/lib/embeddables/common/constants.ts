/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { UiActionsPresentableGroup } from '@kbn/ui-actions-plugin/public';

export const COMMON_EMBEDDABLE_GROUPING: { [key: string]: UiActionsPresentableGroup<unknown> } = {
  legacy: {
    id: 'legacy',
    getDisplayName: () =>
      i18n.translate('embeddableApi.common.constants.grouping.legacy', {
        defaultMessage: 'Legacy',
      }),
    order: -2,
  },
  annotation: {
    id: 'annotation-and-navigation',
    getDisplayName: () =>
      i18n.translate('embeddableApi.common.constants.grouping.annotations', {
        defaultMessage: 'Annotations and Navigation',
      }),
  },
  other: {
    id: 'other',
    getDisplayName: () =>
      i18n.translate('embeddableApi.common.constants.grouping.other', {
        defaultMessage: 'Other',
      }),
    getIconType: () => 'empty',
    order: -1,
  },
};
