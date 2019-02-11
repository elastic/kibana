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

import {
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiEmptyPrompt,
  EuiHorizontalRule,
  EuiPageContent,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Fragment } from 'react';
import { CreateButton } from '../create_button';
import { IndexPatternCreationOption } from '../types';

export const CreateIndexPatternPrompt = ({
  indexPatternCreationOptions,
}: {
  indexPatternCreationOptions: IndexPatternCreationOption[];
}) => (
  <EuiPageContent horizontalPosition="center">
    <EuiEmptyPrompt
      iconType="indexPatternApp"
      title={
        <EuiText grow={false}>
          <h2>
            <FormattedMessage
              id="kbn.management.indexPatternPrompt.title"
              defaultMessage="Create your first index pattern"
            />
          </h2>
        </EuiText>
      }
      body={
        <Fragment>
          <p>
            <FormattedMessage
              id="kbn.management.indexPatternPrompt.subtitle"
              defaultMessage="Index patterns allow you to bucket disparate data sources together so their shared fields may be queried in
                Kibana."
            />
          </p>
          <EuiHorizontalRule margin="l" />
          <EuiText textAlign="left">
            <p>
              <FormattedMessage
                id="kbn.management.indexPatternPrompt.examplesTitle"
                defaultMessage="Examples of index patterns"
              />
            </p>
          </EuiText>
          <EuiDescriptionList className="indexPatternListPrompt__descList">
            <EuiDescriptionListTitle>
              <FormattedMessage
                id="kbn.management.indexPatternPrompt.exampleOneTitle"
                defaultMessage="Single data source"
              />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              <FormattedMessage
                id="kbn.management.indexPatternPrompt.exampleOne"
                defaultMessage="Index a single data source named log-west-001 so you can build charts or query its contents fast."
              />
            </EuiDescriptionListDescription>
            <EuiDescriptionListTitle>
              <FormattedMessage
                id="kbn.management.indexPatternPrompt.exampleTwoTitle"
                defaultMessage="Multiple data sources"
              />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              <FormattedMessage
                id="kbn.management.indexPatternPrompt.exampleTwo"
                defaultMessage="Group all incoming data sources starting with log-west* so you can query against all your west coast server
                  logs."
              />
            </EuiDescriptionListDescription>
            <EuiDescriptionListTitle>
              <FormattedMessage
                id="kbn.management.indexPatternPrompt.exampleThreeTitle"
                defaultMessage="Custom groupings"
              />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              <FormattedMessage
                id="kbn.management.indexPatternPrompt.exampleThree"
                defaultMessage="Specifically group your archived, monthly, roll-up metrics of those logs into a separate index pattern so
                  you can aggregate historical trends to compare."
              />
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        </Fragment>
      }
      actions={[
        <CreateButton options={indexPatternCreationOptions}>
          <FormattedMessage
            id="kbn.management.indexPatternPrompt.createBtn"
            defaultMessage="Create index pattern"
          />
        </CreateButton>,
      ]}
    />
  </EuiPageContent>
);
