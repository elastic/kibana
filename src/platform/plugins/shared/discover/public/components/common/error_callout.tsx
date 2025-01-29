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
  EuiEmptyPrompt,
  useEuiTheme,
  EuiIcon,
  EuiCodeBlock,
  EuiButtonEmpty,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { renderSearchError } from '@kbn/search-errors';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useDiscoverServices } from '../../hooks/use_discover_services';

interface Props {
  title: string;
  error: Error;
  isEsqlMode?: boolean;
}

export const ErrorCallout = ({ title, error, isEsqlMode }: Props) => {
  const { core, docLinks } = useDiscoverServices();
  const { euiTheme } = useEuiTheme();

  const searchErrorDisplay = renderSearchError(error);

  return (
    <EuiEmptyPrompt
      icon={<EuiIcon size="l" type="error" color="danger" />}
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
              {!isEsqlMode && (
                <EuiButton
                  onClick={() => core.notifications.showErrorDialog({ title, error })}
                  data-test-subj="discoverErrorCalloutShowDetailsButton"
                >
                  {i18n.translate('discover.errorCalloutShowErrorMessage', {
                    defaultMessage: 'View details',
                  })}
                </EuiButton>
              )}
            </>
          )}
        </>
      }
      footer={
        isEsqlMode ? (
          <EuiButtonEmpty
            iconType="documentation"
            href={docLinks.links.query.queryESQL}
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
