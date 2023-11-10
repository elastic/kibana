/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButton, EuiEmptyPrompt, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { getSearchErrorOverrideDisplay } from '@kbn/data-plugin/public';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useDiscoverServices } from '../../hooks/use_discover_services';

interface Props {
  title: string;
  error: Error;
}

export const ErrorCallout = ({ title, error }: Props) => {
  const { core } = useDiscoverServices();
  const { euiTheme } = useEuiTheme();

  const overrideDisplay = getSearchErrorOverrideDisplay({
    error,
    application: core.application,
  });

  return (
    <EuiEmptyPrompt
      iconType="error"
      color="danger"
      title={<h2 data-test-subj="discoverErrorCalloutTitle">{overrideDisplay?.title ?? title}</h2>}
      body={
        <div
          css={css`
            text-align: left;
          `}
        >
          {overrideDisplay?.body ?? (
            <>
              <p
                css={css`
                  white-space: break-spaces;
                  font-family: ${euiTheme.font.familyCode};
                `}
                data-test-subj="discoverErrorCalloutMessage"
              >
                {error.message}
              </p>
              <EuiButton onClick={() => core.notifications.showErrorDialog({ title, error })}>
                {i18n.translate('discover.errorCalloutShowErrorMessage', {
                  defaultMessage: 'View details',
                })}
              </EuiButton>
            </>
          )}
        </div>
      }
    />
  );
};
