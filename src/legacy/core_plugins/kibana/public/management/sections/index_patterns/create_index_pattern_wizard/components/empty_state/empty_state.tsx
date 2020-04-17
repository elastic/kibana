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

import React from 'react';

import {
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiTitle,
  EuiPageContentBody,
  EuiPageContent,
  EuiIcon,
  EuiSpacer,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexItem } from '@elastic/eui';
import { EuiDescriptionList } from '@elastic/eui';
import { EuiFlexGrid } from '@elastic/eui';
import { EuiCard } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { EuiLink } from '@elastic/eui';

export const EmptyState = ({ onRefresh }: { onRefresh: () => void }) => (
  <EuiPageContent grow={false} horizontalPosition="center">
    <EuiPageContentHeader>
      <EuiPageContentHeaderSection>
        <EuiTitle>
          <h2>Ready to try Kibana? First, you need data.</h2>
        </EuiTitle>
      </EuiPageContentHeaderSection>
    </EuiPageContentHeader>
    <EuiSpacer size="l" />
    <EuiPageContentBody>
      <EuiFlexGrid columns={3}>
        <EuiFlexItem>
          <EuiCard
            href="#/home/tutorial_directory"
            icon={<EuiIcon size="xl" type="database" color="subdued" />}
            title="Add integration"
            description="Add data from a variety of sources."
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCard
            betaBadgeLabel="Gold license"
            betaBadgeTooltipContent="Requires a different license"
            isDisabled
            icon={<EuiIcon size="xl" type="document" color="subdued" />}
            title="Upload a file"
            description="Import a CSV, NDJSON, or log file."
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCard
            href="#/home/tutorial_directory/sampleData"
            icon={<EuiIcon size="xl" type="heatmap" color="subdued" />}
            title="Add sample data"
            description="Load a data set and a Kibana dashboard."
          />
        </EuiFlexItem>
      </EuiFlexGrid>
      <EuiSpacer size="xxl" />
      <div className="inpEmptyState__footer">
        <EuiFlexGroup responsive={false} wrap>
          <EuiFlexItem>
            <EuiDescriptionList
              listItems={[
                {
                  title: 'Want to learn more?',
                  description: (
                    <EuiLink>
                      Read documentation <EuiIcon type="popout" size="s" />
                    </EuiLink>
                  ),
                },
              ]}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiDescriptionList
              listItems={[
                {
                  title: 'Pretty sure you have data?',
                  description: (
                    <EuiLink onClick={onRefresh} data-test-subj="refreshIndicesButton">
                      <FormattedMessage
                        id="kbn.management.createIndexPattern.emptyState.checkDataButton"
                        defaultMessage="Check for new data"
                      />{' '}
                      <EuiIcon type="refresh" size="s" />
                    </EuiLink>
                  ),
                },
              ]}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </EuiPageContentBody>
  </EuiPageContent>
);
