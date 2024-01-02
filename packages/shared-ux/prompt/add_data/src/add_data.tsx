/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { css } from '@emotion/react';
import React from 'react';

import { EuiButton, EuiEmptyPrompt, EuiEmptyPromptProps, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { withSuspense } from '@kbn/shared-ux-utility';

import { DocumentationLink } from './documentation_link';

export interface AddDataPromptComponentProps {
  addDataHref: string;
  docLink?: string;
  hasApiKeys?: boolean | null;
  emptyPromptColor?: EuiEmptyPromptProps['color'];
}

const EMPTY_PROMPT_COLOR_DEFAULT = 'subdued';

// Using raw value because it is content dependent
const MAX_WIDTH = 830;

/**
 * A presentational component that is shown in cases when there are no data views created yet.
 */
export const AddDataPrompt: React.FC<AddDataPromptComponentProps> = ({
  addDataHref,
  docLink: docLink,
  hasApiKeys,
  emptyPromptColor = EMPTY_PROMPT_COLOR_DEFAULT,
}) => {
  const createDataViewText = i18n.translate('sharedUXPackages.addDataPrompt.addDataText', {
    defaultMessage: 'Add data',
  });

  const actions = (
    <EuiButton
      href={addDataHref}
      iconType="plusInCircle"
      fill={true}
      data-test-subj="createDataViewButton"
    >
      {createDataViewText}
    </EuiButton>
  );

  const title = (
    <h2>
      <FormattedMessage
        id="sharedUXPackages.addDataPrompt.toCreateAddData"
        defaultMessage="To create a data view, add your data to Elasticsearch"
      />
    </h2>
  );

  const body = hasApiKeys ? (
    <p>
      <FormattedMessage
        id="sharedUXPackages.addDataPrompt.dataViewExplanation"
        defaultMessage={`[Placeholder text for prompt to add data when user has created a valid API key.]`}
      />
    </p>
  ) : (
    <p>
      <FormattedMessage
        id="sharedUXPackages.addDataPrompt.dataViewExplanation"
        defaultMessage={`[Placeholder text for prompt to add data when user **does not have** valid API keys.]`}
      />
    </p>
  );

  const footer = docLink ? <DocumentationLink href={docLink} /> : undefined;

  // Load this illustration lazily
  const Illustration = withSuspense(
    React.lazy(() =>
      import('@kbn/shared-ux-prompt-no-data-views').then(({ DataViewIllustration }) => {
        return { default: DataViewIllustration };
      })
    ),
    <EuiPanel color={emptyPromptColor} style={{ width: 226, height: 206 }} />
  );

  return (
    <EuiEmptyPrompt
      data-test-subj="addDataPrompt"
      layout="horizontal"
      css={css`
        max-width: ${MAX_WIDTH}px !important; // Necessary to override EuiEmptyPrompt to fit content
        flex-grow: 0;
      `}
      color={emptyPromptColor}
      {...{
        actions,
        title,
        body,
        footer,
        icon: <Illustration />,
      }}
    />
  );
};
