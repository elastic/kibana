/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import React from 'react';

import { EuiButton, EuiEmptyPrompt, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { withSuspense } from '@kbn/shared-ux-utility';

import { EuiLink, EuiTitle } from '@elastic/eui';

interface DocumentationLinkProps {
  href: string;
}

export function DocumentationLink({ href }: DocumentationLinkProps) {
  return (
    <dl>
      <EuiTitle size="xxs">
        <dt className="eui-displayInline">
          <FormattedMessage
            id="indexPatternManagement.noDataViewsPrompt.learnMore"
            defaultMessage="Want to learn more?"
          />
        </dt>
      </EuiTitle>
      &emsp;
      <dd className="eui-displayInline">
        <EuiLink href={href} target="_blank" external>
          <FormattedMessage
            id="indexPatternManagement.noDataViewsPrompt.readDocumentation"
            defaultMessage="Read the docs"
          />
        </EuiLink>
      </dd>
    </dl>
  );
}

export interface AddDataPromptComponentProps {
  addDataHref: string;
  docLink?: string;
}

// Using raw value because it is content dependent
const MAX_WIDTH = 830;

/**
 * A presentational component that is shown in cases when there are no data views created yet.
 */
export const AddDataPrompt: React.FC<AddDataPromptComponentProps> = ({
  addDataHref,
  docLink: docLink,
}) => {
  const createDataViewText = i18n.translate('indexPatternManagement.addDataPrompt.addDataText', {
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
        id="indexPatternManagement.addDataPrompt.toCreateAddData"
        defaultMessage="To create a data view, add your data to Elasticsearch"
      />
    </h2>
  );

  const body = (
    <p>
      <FormattedMessage
        id="indexPatternManagement.addDataPrompt.dataViewExplanation"
        defaultMessage="Data views identify the Elasticsearch data you want to explore.
          Once you add your data to Elasticsearch, you can point data views to one or
          more of the created indices, data streams, and index aliases. Add your data now
          to start searching."
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
    <EuiPanel color="subdued" css={{ width: 226, height: 206 }} />
  );

  return (
    <EuiEmptyPrompt
      data-test-subj="addDataPrompt"
      layout="horizontal"
      css={css`
        max-width: ${MAX_WIDTH}px !important; // Necessary to override EuiEmptyPrompt to fit content
        flex-grow: 0;
      `}
      color="subdued"
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
