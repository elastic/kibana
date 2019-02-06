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

import React, { Fragment } from 'react';
import {
  EuiEmptyPrompt,
  EuiIcon,
  EuiText,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { CreateButton } from '../create_button';

export const CreateIndexPatternPrompt = ({
  indexPatternCreationOptions
}) => (
  <EuiEmptyPrompt
    className="euiPanel"
    iconType="indexPatternApp"
    title={
      <EuiText grow={false}>
        <h2>
          <FormattedMessage id="kbn.management.indexPatternPrompt.title" defaultMessage="Create your first index pattern" />
        </h2>
      </EuiText>}
    body={
      <Fragment>
        <p style={{ padding: '0 24px' }}>
          <FormattedMessage
            id="kbn.management.indexPatternPrompt.subtitle"
            defaultMessage="Index patterns allow you to bucket disparate data sources together so their shared fields may be queried in
              Kibana."
          />
        </p>
        <EuiHorizontalRule margin="m" />
        <p style={{ textAlign: 'left' }}>
          <FormattedMessage
            id="kbn.management.indexPatternPrompt.examplesTitle"
            defaultMessage="Examples of index patterns"
          />
        </p>
        <div style={{ textAlign: 'left' }}>
          <EuiFlexGroup>
            <EuiFlexItem className="indexPatternPromptListItem">
              <EuiIcon type="document"/>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <FormattedMessage
                id="kbn.management.indexPatternPrompt.exampleOne"
                defaultMessage="Index a single data source named log-west-001 so you can build charts or query its contents fast."
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexGroup>
            <EuiFlexItem className="indexPatternPromptListItem">
              <EuiIcon type="copy"/>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <FormattedMessage
                id="kbn.management.indexPatternPrompt.exampleTwo"
                defaultMessage="Group all incoming data sources starting with log-west* so you can query against all your west coast server
                  logs."
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexGroup>
            <EuiFlexItem className="indexPatternPromptListItem">
              <EuiIcon type="calendar"/>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <FormattedMessage
                id="kbn.management.indexPatternPrompt.exampleThree"
                defaultMessage="Specifically group your archived, monthly, roll-up metrics of those logs into a separate index pattern so
                  you can aggregate histotical trends to compare."
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </Fragment>
    }
    actions={[
      <CreateButton options={indexPatternCreationOptions}>
        <FormattedMessage
          id="kbn.management.indexPatternPrompt.createBtn"
          defaultMessage="Create index pattern"
        />
      </CreateButton>
    ]}
  />);
