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

import {
  EuiButton,
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextAlign,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { withSuspense } from '@kbn/shared-ux-utility';
import { NoDataViewsPromptComponentProps } from '@kbn/shared-ux-prompt-no-data-views-types';

import { i18n } from '@kbn/i18n';
import { DocumentationLink } from './documentation_link';

// max width value to use in pixels
const MAX_WIDTH = 770;

const PromptAddDataViews = ({
  onClickCreate,
  canCreateNewDataView,
  dataViewsDocLink,
  emptyPromptColor,
}: Pick<
  NoDataViewsPromptComponentProps,
  'onClickCreate' | 'canCreateNewDataView' | 'dataViewsDocLink' | 'emptyPromptColor'
>) => {
  // Load this illustration lazily
  const Illustration = withSuspense(
    React.lazy(() =>
      import('./data_view_illustration').then(({ DataViewIllustration }) => {
        return { default: DataViewIllustration };
      })
    ),
    <EuiPanel color="subdued" style={{ width: 110, height: 100 }} />
  );

  const icon = <Illustration />;

  const title = (
    <FormattedMessage
      id="sharedUXPackages.noDataViewsPrompt.createDataView"
      defaultMessage="Create a data view"
    />
  );

  const description = (
    <>
      {canCreateNewDataView ? (
        <FormattedMessage
          id="sharedUXPackages.noDataViewsPrompt.dataViewExplanation"
          defaultMessage="Data views identify the Elasticsearch data you want to explore. You can point data views to one or more data streams, indices, and index aliases, such as your log data from yesterday, or all indices that contain your log data."
        />
      ) : (
        <FormattedMessage
          id="sharedUXPackages.noDataViewsPrompt.noPermission.dataViewExplanation"
          defaultMessage="Data views identify the Elasticsearch data that you want to explore. To create data views, ask your administrator for the required permissions."
        />
      )}
    </>
  );

  const footer = dataViewsDocLink ? (
    <>
      {canCreateNewDataView && (
        <EuiButton onClick={onClickCreate} fill={true} data-test-subj="createDataViewButton">
          <FormattedMessage
            id="sharedUXPackages.noDataViewsPrompt.addDataViewText"
            defaultMessage="Create data view"
          />
        </EuiButton>
      )}
      <EuiHorizontalRule />
      <DocumentationLink href={dataViewsDocLink} data-test-subj="docLinkDataViews" />
    </>
  ) : undefined;

  return (
    <EuiCard
      hasBorder={true}
      data-test-subj="noDataViewsPromptCreateDataView"
      display={emptyPromptColor}
      {...{ icon, title, description, footer }}
    />
  );
};

const PromptTryEsql = ({
  onTryESQL,
  esqlDocLink,
  emptyPromptColor,
}: Pick<
  NoDataViewsPromptComponentProps,
  'onClickCreate' | 'onTryESQL' | 'esqlDocLink' | 'emptyPromptColor'
>) => {
  // Load this illustration lazily
  const Illustration = withSuspense(
    React.lazy(() =>
      import('./esql_illustration').then(({ EsqlIllustration }) => {
        return { default: EsqlIllustration };
      })
    ),
    <EuiPanel color="subdued" style={{ width: 110, height: 100 }} />
  );

  const icon = <Illustration />;

  const title = (
    <FormattedMessage
      id="sharedUXPackages.noDataViewsPrompt.esqlPanel.title"
      defaultMessage="Query your data with ES|QL"
    />
  );

  const description = (
    <FormattedMessage
      id="sharedUXPackages.noDataViewsPrompt.esqlExplanation"
      defaultMessage="ES|QL is a next-generation transformative piped query language and engine developed by Elastic. ES|QL simplifies workflows and advanced searches while accelerating query response for efficient data processing."
    />
  );

  const footer = (
    <>
      {onTryESQL && (
        <EuiButton onClick={onTryESQL} fill={true} data-test-subj="tryESQLLink">
          <FormattedMessage
            id="sharedUXPackages.noDataViewsPrompt.tryEsqlText"
            defaultMessage="Try ES|QL"
          />
        </EuiButton>
      )}
      <EuiHorizontalRule />
      {esqlDocLink && <DocumentationLink href={esqlDocLink} data-test-subj="docLinkEsql" />}
    </>
  );

  return (
    <EuiCard
      hasBorder={true}
      data-test-subj="noDataViewsPromptTryEsql"
      display={emptyPromptColor}
      betaBadgeProps={{
        label: i18n.translate('sharedUXPackages.noDataViewsPrompt.esqlTechnicalPreviewBadge', {
          defaultMessage: 'Technical preview ',
        }),
      }}
      {...{ icon, title, description, footer }}
    />
  );
};

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
  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="spaceEvenly"
      data-test-subj="noDataViewsPrompt"
    >
      <EuiFlexItem
        css={css`
          max-width: ${MAX_WIDTH}px;
        `}
      >
        <EuiText>
          <EuiTextAlign textAlign="center">
            <h2>
              <FormattedMessage
                id="sharedUXPackages.noDataViewsPrompt.youHaveData"
                defaultMessage="You have data in Elasticsearch."
              />
              <EuiSpacer size="s" />
              <EuiText size="s">
                <FormattedMessage
                  id="sharedUXPackages.noDataViewsPrompt.chooseHowToExplore"
                  defaultMessage="Now choose how to explore your data"
                />
              </EuiText>
            </h2>
          </EuiTextAlign>
        </EuiText>

        <EuiSpacer size="xl" />

        <EuiFlexGroup>
          <EuiFlexItem>
            <PromptAddDataViews
              {...{
                onClickCreate,
                canCreateNewDataView,
                dataViewsDocLink,
                emptyPromptColor,
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <PromptTryEsql
              {...{
                onTryESQL,
                esqlDocLink,
                emptyPromptColor,
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
