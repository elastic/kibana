/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { UiActionsPresentableGrouping as PresentableGrouping } from '@kbn/ui-actions-plugin/public';

export const dynamicActionGrouping: PresentableGrouping<EmbeddableApiContext> = [
  {
    id: 'dynamicActions',
    getDisplayName: () =>
      i18n.translate('uiActionsEnhanced.CustomActions', {
        defaultMessage: 'Custom actions',
      }),
    getIconType: () => 'symlink',
    order: 0,
  },
];
