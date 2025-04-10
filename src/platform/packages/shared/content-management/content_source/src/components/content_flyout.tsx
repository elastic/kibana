/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCodeBlock,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
// @ts-expect-error untyped library
import { saveAs } from '@elastic/filesaver';

const flyoutBodyCss = css`
  height: 100%;
  .euiFlyoutBody__overflowContent {
    height: 100%;
    padding: 0;
  }
`;

export interface ContentSourceFlyoutProps {
  onClose: () => void;
  getContent: () => Promise<object>;
}

export const ContentSourceFlyout: React.FC<ContentSourceFlyoutProps> = ({
  onClose,
  getContent,
}) => {
  const [{ content, loading, error }, setContent] = useState<{
    loading: boolean;
    content: Awaited<object> | null;
    error: unknown | null;
  }>({ loading: true, content: null, error: null });

  const onDownload = useCallback(() => {
    const blob = new Blob([JSON.stringify(content, null, 2)], {
      type: 'application/json',
    });
    saveAs(blob, 'export.json');
  }, [content]);

  useEffect(() => {
    const loadContent = () => {
      getContent()
        .then((_content) =>
          setContent((prevState) => ({
            ...prevState,
            loading: false,
            content: _content,
          }))
        )
        .catch((err) =>
          setContent((prevState) => ({
            ...prevState,
            loading: false,
            error: err,
          }))
        );
    };

    loadContent();
  }, [getContent]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle data-test-subj="flyoutTitle">
          <h2>
            <FormattedMessage
              id="contentManagement.contentSource.flyoutTitle"
              defaultMessage="Export dashboard"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody css={flyoutBodyCss}>
        {error ? (
          <EuiCallOut
            title={
              <FormattedMessage
                id="contentManagement.contentSource.flyoutError"
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
                data-test-subj="contentManagement.contentSource.loadingIndicator"
                icon={<EuiLoadingSpinner size="l" />}
              />
            ) : (
              <EuiCodeBlock language="json" isCopyable overflowHeight="100%" isVirtualized>
                {JSON.stringify(content, null, 2)}
              </EuiCodeBlock>
            )}
          </>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="cross"
              flush="left"
              onClick={onClose}
              data-test-subj="closeFlyoutButton"
            >
              <FormattedMessage
                id="contentManagement.contentSource.flyoutCloseButton"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              iconType="download"
              color="primary"
              fill
              onClick={onDownload}
              data-test-subj="downloadButton"
              disabled={loading}
            >
              <FormattedMessage
                id="contentManagement.contentSource.flyoutDownloadButton"
                defaultMessage="Download"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
