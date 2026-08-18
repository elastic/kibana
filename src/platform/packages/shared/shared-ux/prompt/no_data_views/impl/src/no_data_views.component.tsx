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
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTextAlign,
  useEuiPaddingCSS,
  EuiTitle,
  EuiPageTemplate,
  EuiToolTip,
} from '@elastic/eui';
import type { NoDataViewsPromptComponentProps } from '@kbn/shared-ux-prompt-no-data-views-types';
import { ElasticAgentCardIllustration } from '@kbn/shared-ux-card-no-data';
import { DataViewIllustration } from './data_view_illustration';
import { EsqlIllustration } from './esql_illustration';
import { DocumentationLink } from './documentation_link';

// max width value to use in pixels
const MAX_WIDTH = 1200;

const PromptAddData = ({
  addDataHref,
  addDataDocLink,
}: Pick<NoDataViewsPromptComponentProps, 'addDataHref' | 'addDataDocLink'>) => {
  if (!addDataHref) {
    return null;
  }

  const cardTitle = i18n.translate('sharedUXPackages.noDataViewsPrompt.addDataText', {
    defaultMessage: 'Add integrations',
  });

  const cardDescription = i18n.translate('sharedUXPackages.noDataViewsPrompt.addDataExplanation', {
    defaultMessage:
      'There is no data in Elasticsearch yet. Use Elastic Agent to collect data from your systems and services, so you can start exploring it here.',
  });

  return (
    <EuiPageTemplate.EmptyPrompt
      data-test-subj="noDataViewsPromptAddData"
      className="NoDataViewsPromptAddData"
      style={{ maxWidth: 400 }}
      title={
        <EuiTitle size="m">
          <h2>{cardTitle}</h2>
        </EuiTitle>
      }
      icon={<ElasticAgentCardIllustration />}
      body={<p>{cardDescription}</p>}
      actions={
        <EuiButton color="primary" fill data-test-subj="browseIntegrationsLink" href={addDataHref}>
          {i18n.translate('sharedUXPackages.noDataViewsPrompt.addDataButtonLabel', {
            defaultMessage: 'Browse integrations',
          })}
        </EuiButton>
      }
      footer={
        addDataDocLink ? (
          <DocumentationLink href={addDataDocLink} data-test-subj="docLinkAddData" />
        ) : undefined
      }
    />
  );
};

const PromptAddDataViews = ({
  onClickCreate,
  canCreateNewDataView,
  dataViewsDocLink,
}: Pick<
  NoDataViewsPromptComponentProps,
  'onClickCreate' | 'canCreateNewDataView' | 'dataViewsDocLink'
>) => {
  const icon = <DataViewIllustration />;

  const cardTitle = i18n.translate('sharedUXPackages.noDataViewsPrompt.createDataViewText', {
    defaultMessage: 'Create a data view',
  });

  const cardDescription = canCreateNewDataView
    ? i18n.translate('sharedUXPackages.noDataViewsPrompt.dataViewExplanation', {
        defaultMessage: `Data views identify the Elasticsearch data you want to explore. You can point data views to one or more data streams, indices, and index aliases, such as your log data from yesterday, or all indices that contain your log data.`,
      })
    : i18n.translate('sharedUXPackages.noDataViewsPrompt.dataViewExplanationNoPermission', {
        defaultMessage: `Data views identify the Elasticsearch data that you want to explore. To create data views, ask your administrator for the required permissions.`,
      });

  return (
    <EuiPageTemplate.EmptyPrompt
      data-test-subj="noDataViewsPromptCreateDataView"
      className="NoDataViewsPromptCreateDataView"
      style={{ maxWidth: 400 }}
      title={
        <EuiTitle size="m">
          <h2>{cardTitle}</h2>
        </EuiTitle>
      }
      icon={icon}
      body={<p>{cardDescription}</p>}
      actions={
        canCreateNewDataView ? (
          <EuiButton
            color="primary"
            fill
            data-test-subj="createDataViewButton"
            onClick={onClickCreate}
          >
            {i18n.translate('sharedUXPackages.noDataViewsPrompt.addDataViewButtonLabel', {
              defaultMessage: 'Create data view',
            })}
          </EuiButton>
        ) : (
          <EuiToolTip
            position="right"
            content={i18n.translate(
              'sharedUXPackages.noDataViewsPrompt.addDataViewTooltipNoPrivilege',
              {
                defaultMessage: `You don't have permission to create data views. Ask your administrator for the required permissions.`,
              }
            )}
          >
            <EuiButton disabled data-test-subj="createDataViewButton">
              {i18n.translate('sharedUXPackages.noDataViewsPrompt.addDataViewButtonLabel', {
                defaultMessage: 'Create data view',
              })}
            </EuiButton>
          </EuiToolTip>
        )
      }
      footer={<DocumentationLink href={dataViewsDocLink} data-test-subj="docLinkDataViews" />}
    />
  );
};

const PromptTryEsql = ({
  onTryESQL,
  esqlDocLink,
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

  const cardTitle = i18n.translate('sharedUXPackages.noDataViewsPrompt.esqlPanel.title', {
    defaultMessage: 'Query your data with ES|QL',
  });

  const cardDescription = i18n.translate('sharedUXPackages.noDataViewsPrompt.esqlExplanation', {
    defaultMessage:
      'ES|QL is a next-generation piped query language and compute engine developed by Elastic for filtering, transforming, and analyzing data. ES|QL helps streamline your workflows for fast, efficient data processing.',
  });

  return (
    <EuiPageTemplate.EmptyPrompt
      data-test-subj="noDataViewsTryESQL"
      className="NoDataViewsPromptTryESQL"
      style={{ maxWidth: 400 }}
      title={
        <EuiTitle size="m">
          <h2>{cardTitle}</h2>
        </EuiTitle>
      }
      icon={icon}
      body={<p>{cardDescription}</p>}
      actions={
        <EuiButton color="primary" fill data-test-subj="tryESQLLink" onClick={onTryESQL}>
          {i18n.translate('sharedUXPackages.noDataViewsPrompt.tryEsqlButtonLabel', {
            defaultMessage: 'Try ES|QL',
          })}
        </EuiButton>
      }
      footer={<DocumentationLink href={esqlDocLink} data-test-subj="docLinkEsql" />}
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
  addDataHref,
  addDataDocLink,
  showCreateDataView = true,
  emptyPromptColor = 'plain',
}: NoDataViewsPromptComponentProps) => {
  const cssStyles = [
    css`
      max-width: ${MAX_WIDTH}px;
      margin: 0 auto;
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
      css={cssStyles}
    >
      <EuiFlexItem grow={0}>
        <EuiTitle size="l">
          <EuiTextAlign textAlign="center">
            <h2>
              {i18n.translate('sharedUXPackages.noDataViewsPrompt.youHaveData', {
                defaultMessage: 'How do you want to explore your data?',
              })}
            </h2>
          </EuiTextAlign>
        </EuiTitle>

        <EuiSpacer size="xl" />

        <EuiFlexGroup
          gutterSize="none"
          alignItems="stretch"
          css={css`
            min-height: 400px;

            /* Ensure all flex items stretch to full height */
            > .euiFlexItem {
              display: flex !important;
              flex-direction: column !important;
            }

            /* Target nested elements to stretch */
            .euiFlexItem > section,
            [class*='css-'][class*='-euiPageSection-grow-l-center-transparent'],
            [class*='css-'][class*='-euiPageSection__content-l-center'] {
              flex: 1 !important;
              display: flex !important;
              flex-direction: column !important;
            }

            /* Final EmptyPrompt components */
            .NoDataViewsPromptAddData,
            .NoDataViewsPromptCreateDataView,
            .NoDataViewsPromptTryESQL {
              flex: 1 !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
            }
          `}
        >
          {addDataHref && (
            <EuiFlexItem>
              <PromptAddData {...{ addDataHref, addDataDocLink }} />
            </EuiFlexItem>
          )}
          {showCreateDataView && (
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
          )}
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
