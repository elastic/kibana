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
  EuiEmptyPrompt,
  EuiFlexGrid,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTextAlign,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { NoDataViewsPromptComponentProps } from '@kbn/shared-ux-prompt-no-data-views-types';

import { DocumentationLink } from './documentation_link';

// Using raw value because it is content dependent
const MAX_WIDTH = 830;

type PromptAddDataViewsProps = Pick<
  NoDataViewsPromptComponentProps,
  'onClickCreate' | 'canCreateNewDataView' | 'dataViewsDocLink' | 'emptyPromptColor'
>;

const PromptAddDataViews = ({
  onClickCreate,
  canCreateNewDataView,
  dataViewsDocLink,
  emptyPromptColor,
}: PromptAddDataViewsProps) => {
  const title = (
    <h2>
      <FormattedMessage
        id="sharedUXPackages.noDataViewsPrompt.createDataView"
        defaultMessage="Create a data view"
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

  const footer = dataViewsDocLink ? (
    <DocumentationLink href={dataViewsDocLink} data-test-subj="docLinkDataViews" />
  ) : undefined;

  const actions = (
    <>
      {canCreateNewDataView && (
        <EuiButton onClick={onClickCreate} fill={true} data-test-subj="createDataViewButton">
          <FormattedMessage
            id="sharedUXPackages.noDataViewsPrompt.addDataViewText"
            defaultMessage="Create data view"
          />
        </EuiButton>
      )}
    </>
  );

  return (
    <EuiEmptyPrompt
      data-test-subj="noDataViewsPrompt"
      css={css`
        max-width: ${MAX_WIDTH}px !important; // Necessary to override EuiEmptyPrompt to fit content
        flex-grow: 0;
      `}
      color={emptyPromptColor}
      {...{ actions, title, body, footer }}
    />
  );
};

type PromptTryEsqlProps = Pick<
  NoDataViewsPromptComponentProps,
  'onClickCreate' | 'onTryESQL' | 'esqlDocLink' | 'emptyPromptColor'
>;

const PromptTryEsql = ({ onTryESQL, esqlDocLink, emptyPromptColor }: PromptTryEsqlProps) => {
  const title = (
    <h2>
      <FormattedMessage
        id="sharedUXPackages.noDataViewsPrompt.esqlPanel.title"
        defaultMessage="Query you data with ES|QL"
      />
    </h2>
  );

  const body = (
    <p>
      <FormattedMessage
        id="sharedUXPackages.noDataViewsPrompt.esqlExplanation"
        defaultMessage="ES|QL is a next-generation transformative piped query language and engine developed by Elastic. ES|QL simplifies workflows and advanced searches while accelerating query response for efficient data processing."
      />
    </p>
  );

  const footer = esqlDocLink ? (
    <DocumentationLink href={esqlDocLink} data-test-subj="docLinkEsql" />
  ) : undefined;

  const actions = (
    <>
      {onTryESQL && (
        <EuiButton onClick={onTryESQL} fill={true} data-test-subj="tryESQLLink">
          <FormattedMessage
            id="sharedUXPackages.noDataViewsPrompt.tryEsqlText"
            defaultMessage="Try ES|QL"
          />
        </EuiButton>
      )}
    </>
  );

  return (
    <EuiEmptyPrompt
      data-test-subj="noDataViewsPrompt"
      color={emptyPromptColor}
      {...{ actions, title, body, footer }}
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
    <>
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

      <EuiSpacer size="l" />

      <EuiFlexGrid columns={2}>
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
      </EuiFlexGrid>
    </>
  );
};
