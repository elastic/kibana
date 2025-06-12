/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';

import { EuiCallOut, EuiCodeBlock, EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export interface ContentSourceContainerProps {
  getContent: () => Promise<Awaited<object>>;
}

export const ContentSourceContainer = ({ getContent }: ContentSourceContainerProps) => {
  const [{ content, loading, error }, setContent] = useState<{
    loading: boolean;
    content: Awaited<object> | null;
    error: unknown | null;
  }>({ loading: true, content: null, error: null });

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
    </>
  );
};
