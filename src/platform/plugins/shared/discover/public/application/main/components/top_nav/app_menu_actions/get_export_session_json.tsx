/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { DiscoverAppMenuItemType } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import { ExportSessionJsonFlyout } from '../export_session_json_flyout';

export const getExportSessionJsonAppMenuItem = ({
  persistedDiscoverSession,
}: {
  persistedDiscoverSession: DiscoverSession | undefined;
}): DiscoverAppMenuItemType => {
  return {
    id: 'exportSessionJson',
    order: 5,
    label: i18n.translate('discover.localMenu.exportSessionJsonTitle', {
      defaultMessage: 'Export JSON',
    }),
    iconType: 'code',
    testId: 'discoverExportSessionJsonButton',
    disableButton: !persistedDiscoverSession,
    tooltipContent: !persistedDiscoverSession
      ? i18n.translate('discover.localMenu.exportSessionJsonTooltip', {
          defaultMessage: 'Save the Discover session before exporting it as JSON',
        })
      : undefined,
    render: ({ context: { onFinishAction } }) => {
      if (!persistedDiscoverSession) return null;

      return (
        <ExportSessionJsonFlyout
          discoverSessionId={persistedDiscoverSession.id}
          title={persistedDiscoverSession.title}
          onClose={onFinishAction}
        />
      );
    },
  };
};
