/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiEmptyPrompt,
  EuiIcon,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { renderSearchError } from '@kbn/search-errors';
import { i18n } from '@kbn/i18n';
import React from 'react';

export interface ErrorCalloutProps {
  title: string;
  error: Error;
  isEsqlMode?: boolean;
  /** When set, renders the "View details" action (non-ES|QL mode only). */
  showErrorDialog?: (args: { title: string; error: Error }) => void;
  /** Doc link for the ES|QL reference button. Used when `isEsqlMode` is true. */
  esqlReferenceHref?: string;
}

export const ErrorCallout = ({
  title,
  error,
  isEsqlMode,
  showErrorDialog,
  esqlReferenceHref,
}: ErrorCalloutProps) => {
  const { euiTheme } = useEuiTheme();
  const searchErrorDisplay = renderSearchError(error);

  return (
    <EuiEmptyPrompt
      icon={<EuiIcon size="l" type="error" color="danger" aria-hidden={true} />}
      color="plain"
      paddingSize="m"
      css={css`
        margin: ${euiTheme.size.xl} auto;
      `}
      title={
        <h2 data-test-subj="discoverErrorCalloutTitle">{searchErrorDisplay?.title ?? title}</h2>
      }
      titleSize="xs"
      hasBorder
      actions={searchErrorDisplay?.actions ?? []}
      body={
        <>
          {searchErrorDisplay?.body ?? (
            <>
              <EuiCodeBlock
                paddingSize="s"
                language="json"
                isCopyable
                css={css`
                  text-align: left;
                `}
                data-test-subj="discoverErrorCalloutMessage"
              >
                {error.message}
              </EuiCodeBlock>
              {!isEsqlMode && showErrorDialog ? (
                <EuiButton
                  onClick={() => showErrorDialog({ title, error })}
                  data-test-subj="discoverErrorCalloutShowDetailsButton"
                >
                  {i18n.translate('discover.errorCalloutShowErrorMessage', {
                    defaultMessage: 'View details',
                  })}
                </EuiButton>
              ) : null}
            </>
          )}
        </>
      }
      footer={
        isEsqlMode && esqlReferenceHref ? (
          <EuiButtonEmpty
            iconType="documentation"
            href={esqlReferenceHref}
            data-test-subj="discoverErrorCalloutESQLReferenceButton"
            target="_blank"
          >
            {i18n.translate('discover.errorCalloutESQLReferenceButtonLabel', {
              defaultMessage: 'Open ES|QL reference',
            })}
          </EuiButtonEmpty>
        ) : undefined
      }
    />
  );
};
