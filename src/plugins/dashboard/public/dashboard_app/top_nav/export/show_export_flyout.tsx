/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiCallOut,
  EuiCodeBlock,
  EuiEmptyPrompt,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLoadingChart,
  EuiTitle,
} from '@elastic/eui';
import { DashboardApi } from '../../..';

const flyoutBodyCss = css`
  height: 100%;
  .euiFlyoutBody__overflowContent {
    height: 100%;
    padding: 0;
  }
`;

export interface DashboardExportFlyoutProps {
  close: () => void;
  getDashboardState: DashboardApi['getDashboardState'];
}

export const DashboardExportFlyout: React.FC<DashboardExportFlyoutProps> = ({
  close,
  getDashboardState,
}) => {
  const [{ data: dashboard, loading, error }, setDashboardState] = React.useState<{
    loading: boolean;
    data: Awaited<ReturnType<DashboardApi['getDashboardState']>> | null;
    error: unknown | null;
  }>({ loading: true, data: null, error: null });

  useEffect(() => {
    const loadDashboardState = () => {
      getDashboardState()
        .then((_dashboard) =>
          setDashboardState((prevState) => ({
            ...prevState,
            loading: false,
            data: _dashboard,
          }))
        )
        .catch((err) =>
          setDashboardState((prevState) => ({
            ...prevState,
            loading: false,
            error: err,
          }))
        );
    };

    loadDashboardState();
  }, [getDashboardState]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h1 id="exportDashboardFlyout">
            <FormattedMessage
              id="dashboard.topNav.exportFlyoutTitle"
              defaultMessage="Export dashboard"
            />
          </h1>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody css={flyoutBodyCss}>
        {error ? (
          <EuiCallOut
            title={
              <FormattedMessage
                id="dashboard.topNav.exportFlyoutError"
                defaultMessage="An error occurred"
              />
            }
            color="danger"
            iconType="alert"
          />
        ) : (
          <>
            {loading ? (
              <EuiEmptyPrompt
                data-test-subj="dashboardExportLoadingIndicator"
                icon={<EuiLoadingChart size="l" mono />}
              />
            ) : (
              <EuiCodeBlock language="json" isCopyable overflowHeight="100%" isVirtualized>
                {JSON.stringify(dashboard, null, 2)}
              </EuiCodeBlock>
            )}
          </>
        )}
      </EuiFlyoutBody>
    </>
  );
};
