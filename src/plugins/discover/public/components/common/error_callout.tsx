/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
import { useDiscoverServices } from '../../hooks/use_discover_services';

interface Props {
  title: string;
  error: Error;
}

export const ErrorCallout = ({ title, error }: Props) => {
  const { core } = useDiscoverServices();

  const searchErrorDisplay = renderSearchError(error);

  const { euiTheme } = useEuiTheme();

  return (
    <EuiEmptyPrompt
      icon={
        <>
          <EuiIcon size="l" type="error" color="danger" />
        </>
      }
      color="plain"
      paddingSize="m"
      css={css`
        margin: ${euiTheme.size.xl} auto;
      `}
      hasBorder
      title={
        <h2 data-test-subj="discoverErrorCalloutTitle">{searchErrorDisplay?.title ?? title}</h2>
      }
      titleSize="xs"
      actions={searchErrorDisplay?.actions ?? []}
      body={
        <div>
          {searchErrorDisplay?.body ?? (
            <>
              <EuiCodeBlock
                paddingSize="s"
                language="json"
                isCopyable={true}
                css={css`
                  text-align: left;
                `}
              >
                {error.message}
              </EuiCodeBlock>
              {/* TODO: Do not show if ES|QL mode */}
              <EuiButton
                size="s"
                onClick={() => core.notifications.showErrorDialog({ title, error })}
              >
                {i18n.translate('discover.errorCalloutShowErrorMessage', {
                  defaultMessage: 'View details',
                })}
              </EuiButton>
            </>
          )}
        </div>
      }
      footer={
        <>
          {/* TODO: Make this open the reference panel */}
          <EuiButtonEmpty iconType="documentation" href="#">
            Open ES|QL reference
          </EuiButtonEmpty>
        </>
      }
    />
  );
};
