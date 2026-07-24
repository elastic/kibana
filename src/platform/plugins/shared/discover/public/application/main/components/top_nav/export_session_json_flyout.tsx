/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { EuiFlyout } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ExportJsonFlyout } from '@kbn/share-plugin/public';
import {
  DISCOVER_SESSION_API_BASE_PATH,
  DISCOVER_SESSION_API_VERSION,
} from '../../../../../common/constants';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';

/**
 * Minimal client-side view of the as-code Discover session API response.
 * The full schema lives server-side in `discover/server/api/schema.ts`.
 */
interface DiscoverSessionExportResponse {
  id: string;
  data: { title: string } & Record<string, unknown>;
}

export interface ExportSessionJsonFlyoutProps {
  discoverSessionId: string;
  title: string;
  onClose: () => void;
}

export const ExportSessionJsonFlyout = ({
  discoverSessionId,
  title,
  onClose,
}: ExportSessionJsonFlyoutProps) => {
  const { http } = useDiscoverServices();
  const getExportJson = useCallback(() => ({ id: discoverSessionId }), [discoverSessionId]);
  const getSession = useCallback(
    async ({ id }: { id: string }) => {
      const data = await http.get<DiscoverSessionExportResponse>(
        `${DISCOVER_SESSION_API_BASE_PATH}/${encodeURIComponent(id)}`,
        { version: DISCOVER_SESSION_API_VERSION }
      );

      return { data, warnings: [] };
    },
    [http]
  );

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-label={i18n.translate('discover.topNav.exportSessionJson.flyoutAriaLabel', {
        defaultMessage: 'Export Discover session as JSON',
      })}
      data-test-subj="discoverExportSessionJsonFlyout"
    >
      <ExportJsonFlyout
        title={title}
        isTechnicalPreview
        objectType={i18n.translate('discover.topNav.exportSessionJson.objectType', {
          defaultMessage: 'Discover session',
        })}
        closeFlyout={onClose}
        getExportJson={getExportJson}
        sanitizeState={getSession}
      />
    </EuiFlyout>
  );
};
