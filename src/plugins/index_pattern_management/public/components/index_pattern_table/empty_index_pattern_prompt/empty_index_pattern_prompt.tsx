/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import './empty_index_pattern_prompt.scss';

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiPageContent, EuiSpacer, EuiText, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { EuiDescriptionListTitle } from '@elastic/eui';
import { EuiDescriptionListDescription, EuiDescriptionList } from '@elastic/eui';
import { EuiLink } from '@elastic/eui';
import { getListBreadcrumbs } from '../../breadcrumbs';
import { IndexPatternCreationOption } from '../../types';
import { CreateButton } from '../../create_button';
import { Illustration } from './assets/index_pattern_illustration';
import { ManagementAppMountParams } from '../../../../../management/public';

interface Props {
  canSave: boolean;
  creationOptions: IndexPatternCreationOption[];
  docLinksIndexPatternIntro: string;
  setBreadcrumbs: ManagementAppMountParams['setBreadcrumbs'];
}

export const EmptyIndexPatternPrompt = ({
  canSave,
  creationOptions,
  docLinksIndexPatternIntro,
  setBreadcrumbs,
}: Props) => {
  setBreadcrumbs(getListBreadcrumbs());

  return (
    <EuiPageContent
      data-test-subj="emptyIndexPatternPrompt"
      className="inpEmptyIndexPatternPrompt"
      grow={false}
      horizontalPosition="center"
    >
      <EuiFlexGroup gutterSize="xl" alignItems="center" direction="rowReverse" wrap>
        <EuiFlexItem grow={1} className="inpEmptyIndexPatternPrompt__illustration">
          <Illustration />
        </EuiFlexItem>
        <EuiFlexItem grow={2} className="inpEmptyIndexPatternPrompt__text">
          <EuiText grow={false}>
            <h2>
              <FormattedMessage
                id="indexPatternManagement.emptyIndexPatternPrompt.youHaveData"
                defaultMessage="You have data in Elasticsearch."
              />
              <br />
              <FormattedMessage
                id="indexPatternManagement.emptyIndexPatternPrompt.nowCreate"
                defaultMessage="Now, create an index pattern."
              />
            </h2>
            <p>
              <FormattedMessage
                id="indexPatternManagement.emptyIndexPatternPrompt.indexPatternExplanation"
                defaultMessage="Kibana requires an index pattern to identify which indices you want to explore. An
                index pattern can point to a specific index, for example, your log data from
                yesterday, or all indices that contain your log data."
              />
            </p>
            {canSave && (
              <CreateButton options={creationOptions}>
                <FormattedMessage
                  id="indexPatternManagement.indexPatternTable.createBtn"
                  defaultMessage="Create index pattern"
                />
              </CreateButton>
            )}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xxl" />
      <EuiDescriptionList className="inpEmptyIndexPatternPrompt__footer" type="responsiveColumn">
        <EuiDescriptionListTitle className="inpEmptyIndexPatternPrompt__title">
          <FormattedMessage
            id="indexPatternManagement.emptyIndexPatternPrompt.learnMore"
            defaultMessage="Want to learn more?"
          />
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <EuiLink href={docLinksIndexPatternIntro} target="_blank" external>
            <FormattedMessage
              id="indexPatternManagement.emptyIndexPatternPrompt.documentation"
              defaultMessage="Read documentation"
            />
          </EuiLink>
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
    </EuiPageContent>
  );
};
