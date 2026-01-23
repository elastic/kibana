/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { UISession } from '../../../types';
import type { IClickActionDescriptor } from './types';
import type { SearchSessionsMgmtAPI } from '../../../lib/api';
import { InspectFlyout } from '../../inspect_flyout';

export const createInspectActionDescriptor = (
  api: SearchSessionsMgmtAPI,
  uiSession: UISession,
  core: CoreStart
): IClickActionDescriptor => ({
  iconType: 'document',
  label: (
    <FormattedMessage
      id="data.mgmt.searchSessions.flyoutTitle"
      aria-label="Inspect"
      defaultMessage="Inspect"
    />
  ),
  onClick: async () => {
    const overlay = core.overlays.openSystemFlyout(<InspectFlyout searchSession={uiSession} />, {
      id: `inspect-background-search-${uiSession.id}`,
      title: i18n.translate('data.sessions.management.backgroundSearchFlyoutTitle', {
        defaultMessage: 'Inspect background search',
      }),
      size: 'm',
      session: 'inherit',
      type: 'overlay',
      outsideClickCloses: true,
    });
    await overlay.onClose;
  },
});
