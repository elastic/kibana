/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './empty_data_view_prompt.scss';

import React, { lazy, Suspense } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiPageContent, EuiSpacer, EuiText, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { EuiDescriptionListTitle } from '@elastic/eui';
import { EuiDescriptionListDescription, EuiDescriptionList } from '@elastic/eui';
import { EuiLink, EuiButton, EuiLoadingSpinner } from '@elastic/eui';
interface Props {
  goToCreate: () => void;
  canSaveDataView: boolean;
  dataViewsIntroUrl: string;
}

const Illustration = lazy(() => import('./assets/data_view_illustration'));

export const EmptyDataViewPrompt = ({ goToCreate, canSaveDataView, dataViewsIntroUrl }: Props) => {
  return (
    <EuiPageContent
      data-test-subj="emptyDataViewPrompt"
      className="inpEmptyDataViewPrompt"
      grow={false}
      verticalPosition="center"
      horizontalPosition="center"
      color="subdued"
    >
      <EuiFlexGroup gutterSize="xl" alignItems="center" direction="rowReverse" wrap>
        <EuiFlexItem grow={1} className="inpEmptyDataViewPrompt__illustration">
          <Suspense fallback={<EuiLoadingSpinner size="xl" />}>
            <Illustration />
          </Suspense>
        </EuiFlexItem>
        <EuiFlexItem grow={2} className="inpEmptyDataViewPrompt__text">
          <EuiText grow={false}>
            <h2>
              <FormattedMessage
                id="dataViewManagement.emptyDataViewPrompt.youHaveData"
                defaultMessage="You have data in Elasticsearch."
              />
              <br />
              <FormattedMessage
                id="dataViewManagement.emptyDataViewPrompt.nowCreate"
                defaultMessage="Now, create a data view."
              />
            </h2>
            <p>
              <FormattedMessage
                id="dataViewManagement.emptyDataViewPrompt.dataViewExplanation"
                defaultMessage="Kibana requires a data view to identify which data streams, indices, and index aliases you want to explore. A
                data view can point to a specific index, for example, your log data from
                yesterday, or all indices that contain your log data."
              />
            </p>
            {canSaveDataView && (
              <EuiButton
                onClick={goToCreate}
                iconType="plusInCircle"
                fill={true}
                data-test-subj="createDataViewButtonFlyout"
              >
                <FormattedMessage
                  id="dataViewManagement.dataViewTable.createBtn"
                  defaultMessage="Create data view"
                />
              </EuiButton>
            )}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xxl" />
      <EuiDescriptionList className="inpEmptyDataViewPrompt__footer" type="responsiveColumn">
        <EuiDescriptionListTitle className="inpEmptyDataViewPrompt__title">
          <FormattedMessage
            id="dataViewManagement.emptyDataViewPrompt.learnMore"
            defaultMessage="Want to learn more?"
          />
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <EuiLink href={dataViewsIntroUrl} target="_blank" external>
            <FormattedMessage
              id="dataViewManagement.emptyDataViewPrompt.documentation"
              defaultMessage="Read documentation"
            />
          </EuiLink>
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
    </EuiPageContent>
  );
};
