/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { apiHasType, apiPublishesTitle, getTitle } from '@kbn/presentation-publishing';

/** Name to show for a panel: its title, "Untitled {type}" when it has none, or else its ID. */
export const getPanelName = (panel: unknown, panelId: string): string => {
  const title = apiPublishesTitle(panel) ? getTitle(panel) : undefined;
  if (title) return title;
  return apiHasType(panel)
    ? i18n.translate('dashboard.selectedPanelsToolbar.untitledPanelName', {
        defaultMessage: 'Untitled {typeName}',
        values: { typeName: panel.type },
      })
    : panelId;
};
