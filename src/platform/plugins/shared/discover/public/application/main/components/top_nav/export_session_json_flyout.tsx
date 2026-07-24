/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiCodeBlock,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { downloadFileAs } from '@kbn/share-plugin/public';
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
  onClose: () => void;
}

export const ExportSessionJsonFlyout = ({
  discoverSessionId,
  onClose,
}: ExportSessionJsonFlyoutProps) => {
  const flyoutTitleId = useGeneratedHtmlId();
  const { http } = useDiscoverServices();
  const [session, setSession] = useState<DiscoverSessionExportResponse>();
  const [error, setError] = useState<Error>();

  useEffect(() => {
    let mounted = true;

    http
      .get<DiscoverSessionExportResponse>(
        `${DISCOVER_SESSION_API_BASE_PATH}/${discoverSessionId}`,
        { version: DISCOVER_SESSION_API_VERSION }
      )
      .then((response) => {
        if (mounted) setSession(response);
      })
      .catch((fetchError: Error) => {
        if (mounted) setError(fetchError);
      });

    return () => {
      mounted = false;
    };
  }, [http, discoverSessionId]);

  const jsonValue = useMemo(() => (session ? JSON.stringify(session, null, 2) : ''), [session]);

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby={flyoutTitleId}
      data-test-subj="discoverExportSessionJsonFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={flyoutTitleId}>
            <FormattedMessage
              id="discover.topNav.exportSessionJson.flyoutTitle"
              defaultMessage="Export Discover session as JSON"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {error ? (
          <EuiCallOut
            announceOnMount
            color="danger"
            title={i18n.translate('discover.topNav.exportSessionJson.errorTitle', {
              defaultMessage: 'Unable to load the Discover session',
            })}
          >
            {error.message}
          </EuiCallOut>
        ) : !session ? (
          <EuiEmptyPrompt icon={<EuiLoadingSpinner size="xl" />} />
        ) : (
          <EuiCodeBlock
            language="json"
            isCopyable
            overflowHeight="100%"
            data-test-subj="discoverExportSessionJsonCodeBlock"
          >
            {jsonValue}
          </EuiCodeBlock>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              iconType="download"
              disabled={!session}
              data-test-subj="discoverExportSessionJsonDownloadButton"
              onClick={() => {
                if (!session) return;
                downloadFileAs(`${session.data.title || session.id}.json`, {
                  content: jsonValue,
                  type: 'application/json',
                });
                onClose();
              }}
            >
              <FormattedMessage
                id="discover.topNav.exportSessionJson.downloadButtonLabel"
                defaultMessage="Download JSON"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
