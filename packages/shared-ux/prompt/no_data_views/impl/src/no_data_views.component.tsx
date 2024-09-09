/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';

import { EuiEmptyPrompt, EuiPanel } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { withSuspense } from '@kbn/shared-ux-utility';
import { NoDataViewsPromptComponentProps } from '@kbn/shared-ux-prompt-no-data-views-types';

import { DocumentationLink } from './documentation_link';
import { NoDataButtonLink } from './actions';

// Using raw value because it is content dependent
const MAX_WIDTH = 830;

/**
 * A presentational component that is shown in cases when there are no data views created yet.
 */
export const NoDataViewsPrompt = ({
  onClickCreate,
  canCreateNewDataView,
  dataViewsDocLink,
  onTryESQL,
  esqlDocLink,
  emptyPromptColor = 'plain',
}: NoDataViewsPromptComponentProps) => {
  const title = canCreateNewDataView ? (
    <h2>
      <FormattedMessage
        id="sharedUXPackages.noDataViewsPrompt.youHaveData"
        defaultMessage="You have data in Elasticsearch."
      />
      <br />
      <FormattedMessage
        id="sharedUXPackages.noDataViewsPrompt.nowCreate"
        defaultMessage="Now, create a data view."
      />
    </h2>
  ) : (
    <h2>
      <FormattedMessage
        id="sharedUXPackages.noDataViewsPrompt.noPermission.title"
        defaultMessage="You need permission to create data views"
      />
    </h2>
  );

  const body = canCreateNewDataView ? (
    <p>
      <FormattedMessage
        id="sharedUXPackages.noDataViewsPrompt.dataViewExplanation"
        defaultMessage="Data views identify the Elasticsearch data you want to explore. You can point data views to one or more data streams, indices, and index aliases, such as your log data from yesterday, or all indices that contain your log data."
      />
    </p>
  ) : (
    <p>
      <FormattedMessage
        id="sharedUXPackages.noDataViewsPrompt.noPermission.dataViewExplanation"
        defaultMessage="Data views identify the Elasticsearch data that you want to explore. To create data views, ask your administrator for the required permissions."
      />
    </p>
  );

  const footer = dataViewsDocLink ? <DocumentationLink href={dataViewsDocLink} /> : undefined;

  // Load this illustration lazily
  const Illustration = withSuspense(
    React.lazy(() =>
      import('./data_view_illustration').then(({ DataViewIllustration }) => {
        return { default: DataViewIllustration };
      })
    ),
    <EuiPanel color="subdued" style={{ width: 226, height: 206 }} />
  );

  const icon = <Illustration />;
  const actions = (
    <NoDataButtonLink {...{ onClickCreate, canCreateNewDataView, onTryESQL, esqlDocLink }} />
  );

  return (
    <EuiEmptyPrompt
      data-test-subj="noDataViewsPrompt"
      layout="horizontal"
      css={css`
        max-width: ${MAX_WIDTH}px !important; // Necessary to override EuiEmptyPrompt to fit content
        flex-grow: 0;
      `}
      color={emptyPromptColor}
      {...{ actions, icon, title, body, footer }}
    />
  );
};
