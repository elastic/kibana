/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButton,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiLink,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { getSearchErrorOverrideDisplay } from '@kbn/data-plugin/public';
import { i18n } from '@kbn/i18n';
import React, { ReactNode, useState } from 'react';
import { useDiscoverServices } from '../../hooks/use_discover_services';

export interface ErrorCalloutProps {
  title: string;
  error: Error;
  inline?: boolean;
  'data-test-subj'?: string;
}

export const ErrorCallout = ({
  title,
  error,
  inline,
  'data-test-subj': dataTestSubj,
}: ErrorCalloutProps) => {
  const { core } = useDiscoverServices();
  const { euiTheme } = useEuiTheme();

  const showErrorMessage = i18n.translate('discover.errorCalloutShowErrorMessage', {
    defaultMessage: 'Show details',
  });

  const overrideDisplay = getSearchErrorOverrideDisplay({
    error,
    application: core.application,
  });

  const [overrideModalOpen, setOverrideModalOpen] = useState(false);

  const showError = overrideDisplay?.body
    ? () => setOverrideModalOpen(true)
    : () => core.notifications.showErrorDialog({ title, error });

  let formattedTitle: ReactNode = overrideDisplay?.title || title;

  if (inline) {
    const formattedTitleMessage = overrideDisplay
      ? formattedTitle
      : i18n.translate('discover.errorCalloutFormattedTitle', {
          defaultMessage: '{title}: {errorMessage}',
          values: { title, errorMessage: error.message },
        });

    formattedTitle = (
      <>
        <span className="eui-textTruncate" data-test-subj="discoverErrorCalloutMessage">
          {formattedTitleMessage}
        </span>
        <EuiLink
          onClick={showError}
          css={css`
            white-space: nowrap;
            margin-inline-start: ${euiTheme.size.s};
          `}
        >
          {showErrorMessage}
        </EuiLink>
      </>
    );
  }

  return (
    <>
      {inline ? (
        <EuiCallOut
          title={formattedTitle}
          color="danger"
          iconType="error"
          size="s"
          css={css`
            .euiTitle {
              display: flex;
              align-items: center;
            }
          `}
          data-test-subj={dataTestSubj}
        />
      ) : (
        <EuiEmptyPrompt
          iconType="error"
          color="danger"
          title={<h2 data-test-subj="discoverErrorCalloutTitle">{formattedTitle}</h2>}
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
                  <EuiButton onClick={showError}>{showErrorMessage}</EuiButton>
                </>
              )}
            </div>
          }
          data-test-subj={dataTestSubj}
        />
      )}
      {overrideDisplay && overrideModalOpen && (
        <EuiModal onClose={() => setOverrideModalOpen(false)}>
          <EuiModalHeader>
            <EuiModalHeaderTitle data-test-subj="discoverErrorCalloutOverrideModalTitle">
              {overrideDisplay.title}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiText data-test-subj="discoverErrorCalloutOverrideModalBody">
              {overrideDisplay.body}
            </EuiText>
          </EuiModalBody>
        </EuiModal>
      )}
    </>
  );
};
