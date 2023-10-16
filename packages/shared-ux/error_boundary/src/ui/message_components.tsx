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
  EuiPanel,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { errorMessageStrings as strings } from './message_strings';

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
