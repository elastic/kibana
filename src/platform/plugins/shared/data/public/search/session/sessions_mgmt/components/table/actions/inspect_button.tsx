/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { UISession } from '../../../types';
import type { IClickActionDescriptor } from './types';
import type { SearchSessionsMgmtAPI } from '../../../lib/api';
import { InspectFlyoutWrapper } from '../../inspect_flyout';

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
    const overlay = core.overlays.openSystemFlyout(
      <InspectFlyoutWrapper
        uiSettings={core.uiSettings}
        settings={core.settings}
        theme={core.theme}
        searchSession={uiSession}
      />,
      {
        id: `inspect-background-search-${uiSession.id}`,
        size: 'm',
        session: 'inherit',
        type: 'overlay',
        ownFocus: true,
        outsideClickCloses: true,
        'aria-labelledby': 'inspectBackgroundSearchFlyoutTitle',
      }
    );
    await overlay.onClose;
  },
});
