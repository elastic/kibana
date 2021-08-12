/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './empty_index_pattern_prompt.scss';

import React, { lazy, Suspense } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiPageContent, EuiSpacer, EuiText, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { EuiDescriptionListTitle } from '@elastic/eui';
import { EuiDescriptionListDescription, EuiDescriptionList } from '@elastic/eui';
import { EuiLink, EuiButton, EuiLoadingSpinner } from '@elastic/eui';
interface Props {
  goToCreate: () => void;
  canSaveIndexPattern: boolean;
  indexPatternsIntroUrl: string;
}

const Illustration = lazy(() => import('./assets/index_pattern_illustration'));

export const EmptyIndexPatternPrompt = ({
  goToCreate,
  canSaveIndexPattern,
  indexPatternsIntroUrl,
}: Props) => {
  return (
    <EuiPageContent
      data-test-subj="emptyIndexPatternPrompt"
      className="inpEmptyIndexPatternPrompt"
      grow={false}
      verticalPosition="center"
      horizontalPosition="center"
      color="subdued"
    >
      <EuiFlexGroup gutterSize="xl" alignItems="center" direction="rowReverse" wrap>
        <EuiFlexItem grow={1} className="inpEmptyIndexPatternPrompt__illustration">
          <Suspense fallback={<EuiLoadingSpinner size="xl" />}>
            <Illustration />
          </Suspense>
        </EuiFlexItem>
        <EuiFlexItem grow={2} className="inpEmptyIndexPatternPrompt__text">
          <EuiText grow={false}>
            <h2>
              <FormattedMessage
                id="indexPatternEditor.emptyIndexPatternPrompt.youHaveData"
                defaultMessage="You have data in Elasticsearch."
              />
              <br />
              <FormattedMessage
                id="indexPatternEditor.emptyIndexPatternPrompt.nowCreate"
                defaultMessage="Now, create an index pattern."
              />
            </h2>
            <p>
              <FormattedMessage
                id="indexPatternEditor.emptyIndexPatternPrompt.indexPatternExplanation"
                defaultMessage="Kibana requires an index pattern to identify which data streams, indices, and index aliases you want to explore. An
                index pattern can point to a specific index, for example, your log data from
                yesterday, or all indices that contain your log data."
              />
            </p>
            {canSaveIndexPattern && (
              <EuiButton
                onClick={goToCreate}
                iconType="plusInCircle"
                fill={true}
                data-test-subj="createIndexPatternButtonFlyout"
              >
                <FormattedMessage
                  id="indexPatternEditor.indexPatternTable.createBtn"
                  defaultMessage="Create index pattern"
                />
              </EuiButton>
            )}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xxl" />
      <EuiDescriptionList className="inpEmptyIndexPatternPrompt__footer" type="responsiveColumn">
        <EuiDescriptionListTitle className="inpEmptyIndexPatternPrompt__title">
          <FormattedMessage
            id="indexPatternEditor.emptyIndexPatternPrompt.learnMore"
            defaultMessage="Want to learn more?"
          />
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <EuiLink href={indexPatternsIntroUrl} target="_blank" external>
            <FormattedMessage
              id="indexPatternEditor.emptyIndexPatternPrompt.documentation"
              defaultMessage="Read documentation"
            />
          </EuiLink>
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
    </EuiPageContent>
  );
};
