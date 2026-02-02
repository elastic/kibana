/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';

import {
  EuiButton,
  EuiCodeBlock,
  EuiEmptyPrompt,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiLink,
  EuiTitle,
  useGeneratedHtmlId,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiCopy,
  EuiPanel,
} from '@elastic/eui';

import { errorMessageStrings as strings } from './message_strings';

interface FatalPromptProps {
  showErrorDetails: () => void;
  onClickRefresh: () => void;
}

const CodePanel: React.FC<CodePanelProps> = (props) => {
  const { error, errorInfo, name: errorComponentName, onClose } = props;
  const simpleFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'simpleFlyoutTitle',
  });

  const errorName = errorComponentName && strings.details.componentName(errorComponentName);
  const errorTrace = errorInfo?.componentStack ?? error.stack ?? error.toString();

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby={simpleFlyoutTitleId}
      paddingSize="none"
      session="never"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiPanel paddingSize="m" hasBorder={false} hasShadow={false}>
          <EuiTitle size="m">
            <h2>{strings.details.title()}</h2>
          </EuiTitle>
        </EuiPanel>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiCodeBlock data-test-subj="errorBoundaryFatalDetailsErrorString">
          <p>{(error.stack ?? error.toString()) + '\n\n'}</p>
          <p>
            {errorName}
            {errorTrace}
          </p>
        </EuiCodeBlock>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiPanel paddingSize="m" hasBorder={false} hasShadow={false}>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={onClose} flush="left">
                {strings.details.closeButton()}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiCopy textToCopy={errorName + '\n\n' + errorTrace}>
                {(copy) => (
                  <EuiButton onClick={copy} fill iconType="copyClipboard">
                    {strings.details.copyToClipboardButton()}
                  </EuiButton>
                )}
              </EuiCopy>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

export const FatalPrompt = withErrorDetails(
  ({ showErrorDetails, onClickRefresh }: FatalPromptProps): JSX.Element => (
    <EuiEmptyPrompt
      title={
        <h2 data-test-subj="errorBoundaryFatalHeader">{strings.page.callout.fatal.title()}</h2>
      }
      color="danger"
      iconType="error"
      body={
        <>
          <p data-test-subj="errorBoundaryFatalPromptBody">{strings.page.callout.fatal.body()}</p>
          <p>
            <EuiButton
              color="danger"
              iconType="refresh"
              fill={true}
              onClick={onClickRefresh}
              data-test-subj="errorBoundaryFatalPromptReloadBtn"
            >
              {strings.page.callout.fatal.pageReloadButton()}
            </EuiButton>
          </p>
          <p>
            <EuiLink
              color="danger"
              onClick={showErrorDetails}
              data-test-subj="errorBoundaryFatalShowDetailsBtn"
            >
              {strings.page.callout.fatal.showDetailsButton()}
            </EuiLink>
          </p>
        </>
      }
    />
  )
);

interface RecoverablePromptProps {
  onClickRefresh: () => void;
}

export const RecoverablePrompt = ({ onClickRefresh }: RecoverablePromptProps) => {
  return (
    <EuiEmptyPrompt
      title={
        <h2 data-test-subj="errorBoundaryRecoverableHeader">
          {strings.page.callout.recoverable.title()}
        </h2>
      }
      color="warning"
      iconType="warning"
      body={
        <p data-test-subj="errorBoundaryRecoverablePromptBody">
          {strings.page.callout.recoverable.body()}
        </p>
      }
      actions={
        <EuiButton
          color="warning"
          iconType="refresh"
          fill={true}
          onClick={onClickRefresh}
          data-test-subj="errorBoundaryRecoverablePromptReloadBtn"
        >
          {strings.page.callout.recoverable.pageReloadButton()}
        </EuiButton>
      }
    />
  );
};

interface SectionFatalPromptProps {
  sectionName: string;
  showErrorDetails: () => void;
}

export const SectionFatalPrompt = withErrorDetails(
  ({ sectionName, showErrorDetails }: SectionFatalPromptProps): JSX.Element => {
    return (
      <EuiEmptyPrompt
        iconType="error"
        color="danger"
        title={
          <h2 data-test-subj="sectionErrorBoundaryPromptHeader">
            {strings.section.callout.fatal.title(sectionName)}
          </h2>
        }
        body={
          <>
            <p data-test-subj="sectionErrorBoundaryPromptBody">
              {strings.section.callout.fatal.body(sectionName)}
            </p>
            <p>
              <EuiLink color="danger" onClick={showErrorDetails}>
                {strings.section.callout.fatal.showDetailsButton()}
              </EuiLink>
            </p>
          </>
        }
      />
    );
  }
);

interface SectionRecoverablePromptProps {
  sectionName: string;
  onClickRefresh: () => void;
}

export const SectionRecoverablePrompt = ({
  sectionName,
  onClickRefresh,
}: SectionRecoverablePromptProps): JSX.Element => {
  return (
    <EuiEmptyPrompt
      color="warning"
      iconType="warning"
      title={
        <h2 data-test-subj="sectionErrorBoundaryPromptHeader">
          {strings.section.callout.recoverable.title(sectionName)}
        </h2>
      }
      body={
        <p data-test-subj="sectionErrorBoundaryPromptBody">
          {strings.section.callout.recoverable.body(sectionName)}
        </p>
      }
      actions={
        <EuiButton
          color="warning"
          iconType="refresh"
          fill={true}
          onClick={onClickRefresh}
          data-test-subj="sectionErrorBoundaryRecoverBtn"
        >
          {strings.section.callout.recoverable.pageReloadButton()}
        </EuiButton>
      }
    />
  );
};

interface ErrorDetailsProps {
  error: Error;
  errorInfo: Partial<React.ErrorInfo> | null;
  name: string | null;
}

interface ErrorPromptProps {
  showErrorDetails: () => void;
}

function withErrorDetails<PromptComponentProps extends ErrorPromptProps = ErrorPromptProps>(
  PromptComponent: React.FC<PromptComponentProps>
): React.FC<ErrorDetailsProps & Omit<PromptComponentProps, 'showErrorDetails'>> {
  return ({ error, errorInfo, name, ...rest }) => {
    const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);

    return (
      <>
        <PromptComponent {...(rest as any)} showErrorDetails={() => setIsFlyoutVisible(true)} />
        {isFlyoutVisible ? (
          <CodePanel
            error={error}
            errorInfo={errorInfo}
            name={name}
            onClose={() => setIsFlyoutVisible(false)}
          />
        ) : null}
      </>
    );
  };
}

interface CodePanelProps {
  error: Error;
  errorInfo: Partial<React.ErrorInfo> | null;
  name: string | null;
  onClose: () => void;
}
