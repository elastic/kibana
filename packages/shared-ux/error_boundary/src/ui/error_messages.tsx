/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiAccordion,
  EuiButton,
  EuiCallOut,
  EuiCode,
  EuiCodeBlock,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';

const DATA_TEST_SUBJ_PAGE_REFRESH_BUTTON = 'pageReloadButton';
const DATA_TEST_SUBJ_PAGE_DETAILS_BUTTON = 'showDetailsButton';

export interface ErrorCalloutProps {
  error: Error;
  errorInfo: Partial<React.ErrorInfo> | null;
  name: string | null;
  reloadWindow: () => void;
}

export const FatalPrompt = (props: ErrorCalloutProps) => {
  const { error, errorInfo, name: errorComponentName, reloadWindow } = props;
  const errorBoundaryAccordionId = useGeneratedHtmlId({ prefix: 'errorBoundaryAccordion' });
  return (
    <EuiCallOut title="A fatal error was encountered" color="danger" iconType="error">
      <p>Try refreshing this page.</p>
      <EuiAccordion id={errorBoundaryAccordionId} buttonContent="Show detail">
        <EuiPanel paddingSize="m">
          <EuiCodeBlock>
            {errorComponentName && (
              <p>
                An error occurred in <EuiCode>{errorComponentName}</EuiCode>
              </p>
            )}
            {error?.message && <p>{error.message}</p>}
            {errorInfo?.componentStack}
          </EuiCodeBlock>
        </EuiPanel>
      </EuiAccordion>
      <EuiSpacer />
      <p>
        <EuiButton color="danger" fill={true} onClick={reloadWindow}>
          Refresh
        </EuiButton>
      </p>
    </EuiCallOut>
  );
};

export const FatalInline = (_props: ErrorCalloutProps) => {
  return <EuiCallOut color="danger" iconType="error" title="Error: unable to load." />;
};

export const FatalToastTitle = () => (
  <FormattedMessage
    id="sharedUXPackages.error_boundary.fatal.toastError.title"
    defaultMessage="A fatal error was encountered."
  />
);

export const FatalToastText = ({ reloadWindow }: { reloadWindow: () => void }) => {
  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <p>Try refreshing the page.</p>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="s" direction="row">
          <EuiFlexItem>
            <EuiButton
              size="s"
              onClick={() => {}}
              data-test-subj={DATA_TEST_SUBJ_PAGE_DETAILS_BUTTON}
              fill={false}
              color="danger"
            >
              <FormattedMessage
                id="sharedUXPackages.error_boundary.toastError.fatal.details"
                defaultMessage="Show details"
              />
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButton
              size="s"
              onClick={reloadWindow}
              data-test-subj={DATA_TEST_SUBJ_PAGE_REFRESH_BUTTON}
              fill={true}
              color="danger"
            >
              <FormattedMessage
                id="sharedUXPackages.error_boundary.toastError.fatal.pageRefreshButtonLabel"
                defaultMessage="Refresh"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const RecoverablePrompt = (props: ErrorCalloutProps) => {
  const { reloadWindow } = props;
  return (
    <EuiEmptyPrompt
      iconType="broom"
      title={<h2>Sorry, please refresh</h2>}
      body={<p>An error occurred when trying to load a part of the page. Please try refreshing.</p>}
      color="primary"
      actions={
        <EuiButton fill={true} onClick={reloadWindow}>
          Refresh
        </EuiButton>
      }
    />
  );
};

export const RecoverableInline = (props: ErrorCalloutProps) => {
  return <EuiCallOut iconType="broom" title="Please refresh." onClick={props.reloadWindow} />;
};

export const RecoverableToastTitle = () => (
  <FormattedMessage
    id="sharedUXPackages.error_boundary.toastError.recoverable.title"
    defaultMessage="Sorry, please refresh"
  />
);

export const RecoverableToastText = ({ reloadWindow }: { reloadWindow: () => void }) => {
  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <p>An error occurred when trying to load a part of the page. Please try refreshing.</p>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="s" direction="row">
          <EuiFlexItem>
            <EuiButton
              size="s"
              onClick={reloadWindow}
              data-test-subj={DATA_TEST_SUBJ_PAGE_REFRESH_BUTTON}
              fill={true}
            >
              <FormattedMessage
                id="sharedUXPackages.error_boundary.toastError.recoverable.pageRefreshButtonLabel"
                defaultMessage="Refresh"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
