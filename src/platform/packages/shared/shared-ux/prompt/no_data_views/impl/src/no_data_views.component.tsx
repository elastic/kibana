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
  EuiSpacer,
  EuiText,
  EuiTextAlign,
  EuiToolTip,
  useEuiPaddingCSS,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { NoDataViewsPromptComponentProps } from '@kbn/shared-ux-prompt-no-data-views-types';

import { DocumentationLink } from './documentation_link';
import { DataViewIllustration } from './data_view_illustration';
import { EsqlIllustration } from './esql_illustration';

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
  const icon = <DataViewIllustration />;

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
      {canCreateNewDataView ? (
        <EuiButton onClick={onClickCreate} fill={true} data-test-subj="createDataViewButton">
          <FormattedMessage
            id="sharedUXPackages.noDataViewsPrompt.addDataViewText"
            defaultMessage="Create data view"
          />
        </EuiButton>
      ) : (
        <EuiToolTip
          position="right"
          content={
            <FormattedMessage
              id="sharedUXPackages.noDataViewsPrompt.addDataViewTooltipNoPrivilege"
              defaultMessage="Ask your administrator for the permissions required to create a data view."
            />
          }
        >
          <EuiButton disabled data-test-subj="createDataViewButton">
            <FormattedMessage
              id="sharedUXPackages.noDataViewsPrompt.addDataViewTextNoPrivilege"
              defaultMessage="Create data view"
            />
          </EuiButton>
        </EuiToolTip>
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
  if (!onTryESQL) {
    // we need to handle the case where the Try ES|QL click handler is not set because
    // onTryESQL is set via a useEffect that has asynchronous dependencies
    return null;
  }

  const icon = <EsqlIllustration />;

  const title = (
    <FormattedMessage
      id="sharedUXPackages.noDataViewsPrompt.esqlPanel.title"
      defaultMessage="Query your data with ES|QL"
    />
  );

  const description = (
    <FormattedMessage
      id="sharedUXPackages.noDataViewsPrompt.esqlExplanation"
      defaultMessage="ES|QL is a next-generation piped query language and compute engine developed by Elastic for filtering, transforming, and analyzing data. ES|QL helps streamline your workflows for fast, efficient data processing."
    />
  );

  const footer = (
    <>
      <EuiButton onClick={onTryESQL} fill={true} data-test-subj="tryESQLLink">
        <FormattedMessage
          id="sharedUXPackages.noDataViewsPrompt.tryEsqlText"
          defaultMessage="Try ES|QL"
        />
      </EuiButton>
      <EuiHorizontalRule />
      {esqlDocLink && <DocumentationLink href={esqlDocLink} data-test-subj="docLinkEsql" />}
    </>
  );

  return (
    <EuiCard
      hasBorder={true}
      data-test-subj="noDataViewsPromptTryEsql"
      display={emptyPromptColor}
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
  const cssStyles = [
    css`
      max-width: ${MAX_WIDTH}px;
    `,
    useEuiPaddingCSS('top').m,
    useEuiPaddingCSS('right').m,
    useEuiPaddingCSS('left').m,
  ];

  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="spaceEvenly"
      data-test-subj="noDataViewsPrompt"
    >
      <EuiFlexItem css={cssStyles}>
        <EuiText>
          <EuiTextAlign textAlign="center">
            <h2>
              <FormattedMessage
                id="sharedUXPackages.noDataViewsPrompt.youHaveData"
                defaultMessage="How do you want to explore your Elasticsearch data?"
              />
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
