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

import React, { FunctionComponent } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiPageContent, EuiSpacer, EuiText, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { EuiDescriptionListTitle } from '@elastic/eui';
import { EuiDescriptionListDescription, EuiDescriptionList } from '@elastic/eui';
import { EuiLink } from '@elastic/eui';
import { getDocLink } from 'ui/documentation_links';
import { IndexPatternCreationOption } from '../types';
import { CreateButton } from '../create_button';
// @ts-ignore
import { Illustration } from '../assets/index_pattern_illustration';

interface Props {
  indexPatternCreationOptions: IndexPatternCreationOption[];
}

export const CreateIndexPatternPrompt: FunctionComponent<Props> = ({
  indexPatternCreationOptions,
}) => {
  // const { services } = useKibana();

  return (
    <EuiPageContent
      className="inpCreateIndexPatternPrompt"
      grow={false}
      horizontalPosition="center"
    >
      <EuiFlexGroup gutterSize="xl" alignItems="center" direction="rowReverse" wrap>
        <EuiFlexItem grow={1} className="inpCreateIndexPatternPrompt__illustration">
          <Illustration />
        </EuiFlexItem>
        <EuiFlexItem grow={2} className="inpCreateIndexPatternPrompt__text">
          <EuiText grow={false}>
            <h2>
              <FormattedMessage
                id="kbn.management.createIndexPatternPrompt.youHaveData"
                defaultMessage="You have data in Elasticsearch."
              />
              <br />
              <FormattedMessage
                id="kbn.management.createIndexPatternPrompt.nowCreate"
                defaultMessage="Now, create an index pattern."
              />
            </h2>
            <p>
              <FormattedMessage
                id="kbn.management.createIndexPatternPrompt.indexPatternExplanation"
                defaultMessage="Kibana requires an index pattern to identify which indices you want to explore. An
                index pattern can point to a specific index, for example, your log data from
                yesterday, or all indices that contain your log data."
              />
            </p>
            <CreateButton options={indexPatternCreationOptions}>
              <FormattedMessage
                id="kbn.management.indexPatternTable.createBtn"
                defaultMessage="Create index pattern"
              />
            </CreateButton>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xxl" />
      <EuiDescriptionList className="inpCreateIndexPatternPrompt__footer" type="responsiveColumn">
        <EuiDescriptionListTitle style={{ width: 'auto' }}>
          <FormattedMessage
            id="kbn.management.createIndexPatternPrompt.learnMore"
            defaultMessage="Want to learn more?"
          />
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <EuiLink href={getDocLink('indexPatterns.introduction')} target="_blank" external>
            <FormattedMessage
              id="kbn.management.createIndexPatternPrompt.documentation"
              defaultMessage="Read documentation"
            />
          </EuiLink>
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
    </EuiPageContent>
  );
};
