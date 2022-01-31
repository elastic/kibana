/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './empty_data_prompt.scss';

import React, { lazy, Suspense } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiPageContent, EuiSpacer, EuiText, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { EuiDescriptionListTitle } from '@elastic/eui';
import { EuiDescriptionListDescription, EuiDescriptionList } from '@elastic/eui';
import { EuiLink, EuiButton, EuiLoadingSpinner } from '@elastic/eui';
interface Props {
  goToCreate: () => void;
  canAddData: boolean;
  addDataUrl: string;
}

const Illustration = lazy(() => import('./assets/data_illustration'));

export const EmptyDataPrompt = ({ goToCreate, canAddData, addDataUrl }: Props) => {
  return (
    <EuiPageContent
      data-test-subj="emptyDataPrompt"
      className="inpEmptyDataPrompt"
      grow={false}
      verticalPosition="center"
      horizontalPosition="center"
      color="subdued"
    >
      <EuiFlexGroup gutterSize="xl" alignItems="center" direction="rowReverse" wrap>
        <EuiFlexItem grow={1} className="inpEmptyDataPrompt__illustration">
          <Suspense fallback={<EuiLoadingSpinner size="xl" />}>
            <Illustration />
          </Suspense>
        </EuiFlexItem>
        <EuiFlexItem grow={2} className="inpEmptyDataPrompt__text">
          <EuiText grow={false}>
            <h2>
              <FormattedMessage
                id="dataViewManagement.emptyDataPrompt.toWorkWith"
                defaultMessage="To work with Data Views,"
              />
              <br />
              <FormattedMessage
                id="dataViewManagement.emptyDataPrompt.youNeedData"
                defaultMessage="you need data."
              />
            </h2>
            <p>
              <FormattedMessage
                id="dataViewManagement.emptyDataPrompt.dataExplanation"
                defaultMessage="The best way to add data to the Elastic Stack is to use one of our many integrations, which are pre-packaged assets that are available for a wide array of popular services and platforms. With integrations, you can add monitoring for logs and metrics, protect systems from security threats, and more."
              />
            </p>
            {canAddData && (
              <EuiButton onClick={goToCreate} fill={true} data-test-subj="createDataButtonFlyout">
                <FormattedMessage
                  id="dataViewManagement.emptyDataPrompt.addData"
                  defaultMessage="Add Data"
                />
              </EuiButton>
            )}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xxl" />
      <EuiDescriptionList className="inpEmptyDataPrompt__footer" type="responsiveColumn">
        <EuiDescriptionListTitle className="inpEmptyDataPrompt__title">
          <FormattedMessage
            id="dataViewManagement.emptyDataPrompt.learnMore"
            defaultMessage="Want to learn more?"
          />
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <EuiLink href={addDataUrl} target="_blank" external>
            <FormattedMessage
              id="dataViewManagement.emptyDataPrompt.documentation"
              defaultMessage="Read documentation"
            />
          </EuiLink>
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
    </EuiPageContent>
  );
};
