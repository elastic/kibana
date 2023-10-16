/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import {
  EuiAccordion,
  EuiButton,
  EuiCallOut,
  EuiCodeBlock,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { errorMessageStrings as strings } from './message_strings';

const DATA_TEST_SUBJ_PAGE_REFRESH_BUTTON = 'pageReloadButton';
const DATA_TEST_SUBJ_PAGE_DETAILS_BUTTON = 'showDetailsButton';

export interface ErrorCalloutProps {
  error: Error;
  errorInfo: Partial<React.ErrorInfo> | null;
  name: string | null;
  reloadWindow: () => void;
}

export const FatalInline = (_props: ErrorCalloutProps) => {
  return <EuiCallOut color="danger" iconType="error" title={strings.fatal.inline.title()} />;
};

export const FatalPrompt = (props: ErrorCalloutProps) => {
  const { error, errorInfo, name: errorComponentName, reloadWindow } = props;
  const errorBoundaryAccordionId = useGeneratedHtmlId({ prefix: 'errorBoundaryAccordion' });
  return (
    <EuiCallOut title={strings.fatal.callout.title()} color="danger" iconType="error">
      <p>{strings.fatal.callout.body}</p>
      <EuiAccordion
        id={errorBoundaryAccordionId}
        buttonContent={strings.fatal.callout.showDetailsButton()}
      >
        <EuiPanel paddingSize="m">
          <EuiCodeBlock>
            {errorComponentName && (
              <p>{strings.fatal.callout.details.componentName(errorComponentName)}</p>
            )}
            {error?.message && <p>{error.message}</p>}
            {errorInfo?.componentStack}
          </EuiCodeBlock>
        </EuiPanel>
      </EuiAccordion>
      <EuiSpacer />
      <p>
        <EuiButton color="danger" fill={true} onClick={reloadWindow}>
          {strings.fatal.callout.pageReloadButton()}
        </EuiButton>
      </p>
    </EuiCallOut>
  );
};

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
              {strings.fatal.toast.showDetailsButton()}
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
              {strings.fatal.toast.pageReloadButton()}
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
      title={<h2>{strings.recoverable.callout.title()}</h2>}
      body={<p>{strings.recoverable.callout.body()}</p>}
      color="primary"
      actions={
        <EuiButton fill={true} onClick={reloadWindow}>
          {strings.recoverable.callout.pageReloadButton()}
        </EuiButton>
      }
    />
  );
};

export const RecoverableInline = (props: ErrorCalloutProps) => {
  return (
    <EuiCallOut size="m">
      <EuiLink onClick={props.reloadWindow} data-test-subj={DATA_TEST_SUBJ_PAGE_REFRESH_BUTTON}>
        {strings.recoverable.inline.linkText()}
      </EuiLink>
    </EuiCallOut>
  );
};

export const RecoverableToastText = ({ reloadWindow }: { reloadWindow: () => void }) => {
  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <p>{strings.recoverable.toast.body()}</p>
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
              {strings.recoverable.toast.pageReloadButton()}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
