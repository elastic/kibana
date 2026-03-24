/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCodeBlock,
  EuiEmptyPrompt,
  EuiPage,
  EuiPageBody,
  EuiPageSection,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FatalError } from '@kbn/core-fatal-errors-browser';
import { formatError, formatStack } from './utils';

interface GenericErrorProps {
  buildNumber: number;
  errors: FatalError[];
  kibanaVersion: string;
}

export function GenericError({ kibanaVersion, buildNumber, errors }: GenericErrorProps) {
  const handleClickBack = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    window.history.back();
  }, []);

  const handleClickClearSession = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    localStorage.clear();
    sessionStorage.clear();
    window.location.hash = '';
    window.location.reload();
  }, []);

  return (
    <EuiPage css={{ minHeight: '100vh', alignItems: 'center' }} data-test-subj="fatalErrorScreen">
      <EuiPageBody>
        <EuiPageSection alignment="center">
          <EuiEmptyPrompt
            iconType="warning"
            iconColor="danger"
            title={
              <h2>
                <FormattedMessage
                  id="core.fatalErrors.somethingWentWrongTitle"
                  defaultMessage="Something went wrong"
                />
              </h2>
            }
            body={
              <p>
                <FormattedMessage
                  id="core.fatalErrors.tryRefreshingPageDescription"
                  defaultMessage="Try refreshing the page. If that doesn't work, go back to the previous page or
                  clear your session data."
                />
              </p>
            }
            actions={[
              <EuiButton
                color="primary"
                fill
                onClick={handleClickClearSession}
                data-test-subj="clearSession"
              >
                <FormattedMessage
                  id="core.fatalErrors.clearYourSessionButtonLabel"
                  defaultMessage="Clear your session"
                />
              </EuiButton>,
              <EuiButtonEmpty onClick={handleClickBack} data-test-subj="goBack">
                <FormattedMessage
                  id="core.fatalErrors.goBackButtonLabel"
                  defaultMessage="Go back"
                />
              </EuiButtonEmpty>,
            ]}
          />
          {errors.map(({ error, source }, i) => (
            <EuiCallOut
              key={i}
              title={formatError(error, source)}
              color="danger"
              iconType="warning"
            >
              <EuiCodeBlock language="bash" className="eui-textBreakAll">
                {`Version: ${kibanaVersion}` +
                  '\n' +
                  `Build: ${buildNumber}` +
                  '\n' +
                  formatStack(error)}
              </EuiCodeBlock>
            </EuiCallOut>
          ))}
        </EuiPageSection>
      </EuiPageBody>
    </EuiPage>
  );
}
