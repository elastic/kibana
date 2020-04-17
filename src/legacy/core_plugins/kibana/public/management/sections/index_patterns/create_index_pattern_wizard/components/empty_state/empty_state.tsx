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
import { EuiText } from '@elastic/eui';
import { EuiFlexGrid } from '@elastic/eui';
import { EuiCard } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { EuiButtonEmpty } from '@elastic/eui';

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
      <dl className="inpEmptyState__footer">
        <EuiFlexGroup responsive={false} wrap>
          <EuiFlexItem>
            <EuiText>
              <dt>Want to learn more?</dt>
              <dd>
                <EuiButtonEmpty iconType="popout" iconSide="right" flush="left">
                  Read documentation
                </EuiButtonEmpty>
              </dd>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText>
              <dt>Pretty sure you have data?</dt>
              <dd>
                <EuiButtonEmpty
                  iconType="refresh"
                  iconSide="right"
                  flush="left"
                  onClick={onRefresh}
                  data-test-subj="refreshIndicesButton"
                >
                  <FormattedMessage
                    id="kbn.management.createIndexPattern.emptyState.checkDataButton"
                    defaultMessage="Check for new data"
                  />
                </EuiButtonEmpty>
              </dd>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </dl>
    </EuiPageContentBody>
    {/* <EuiCallOut
      color="warning"
      title={
        <FormattedMessage
          id="kbn.management.createIndexPattern.emptyStateHeader"
          defaultMessage="Couldn't find any Elasticsearch data"
        />
      }
    >
      <dd>
        <FormattedMessage
          id="kbn.management.createIndexPattern.emptyStateLabel.emptyStateDetail"
          defaultMessage="{needToIndex} {learnHowLink} or {getStartedLink}"
          values={{
            needToIndex: (
              <EuiTextColor color="subdued">
                <FormattedMessage
                  id="kbn.management.createIndexPattern.emptyStateLabel.needToIndexLabel"
                  defaultMessage="You'll need to index some data into Elasticsearch before you can create an index pattern."
                />
              </EuiTextColor>
            ),
            learnHowLink: (
              <EuiLink href="#/home/tutorial_directory">
                <FormattedMessage
                  id="kbn.management.createIndexPattern.emptyStateLabel.learnHowLink"
                  defaultMessage="Learn how"
                />
              </EuiLink>
            ),
            getStartedLink: (
              <EuiLink href="#/home/tutorial_directory/sampleData">
                <FormattedMessage
                  id="kbn.management.createIndexPattern.emptyStateLabel.getStartedLink"
                  defaultMessage="get started with some sample data sets."
                />
              </EuiLink>
            ),
          }}
        />
      </dd>

      <EuiButton
        iconType="refresh"
        onClick={onRefresh}
        data-test-subj="refreshIndicesButton"
        color="warning"
      >
        <FormattedMessage
          id="kbn.management.createIndexPattern.emptyState.checkDataButton"
          defaultMessage="Check for new data"
        />
      </EuiButton>
    </EuiCallOut> */}
  </EuiPageContent>
);
