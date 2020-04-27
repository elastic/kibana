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
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { getDocLink } from 'ui/documentation_links';

import {
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiTitle,
  EuiPageContentBody,
  EuiPageContent,
  EuiIcon,
  EuiSpacer,
  EuiFlexItem,
  EuiDescriptionList,
  EuiFlexGrid,
  EuiCard,
  EuiLink,
} from '@elastic/eui';

export const EmptyState = ({ onRefresh }: { onRefresh: () => void }) => {
  return (
    <EuiPageContent className="inpEmptyState" grow={false} horizontalPosition="center">
      <EuiPageContentHeader>
        <EuiPageContentHeaderSection>
          <EuiTitle>
            <h2>
              <FormattedMessage
                id="kbn.management.emptyState.noDataTitle"
                defaultMessage="Ready to try Kibana? First, you need data."
              />
            </h2>
          </EuiTitle>
        </EuiPageContentHeaderSection>
      </EuiPageContentHeader>
      <EuiSpacer size="m" />
      <EuiPageContentBody>
        <EuiFlexGrid className="inpEmptyState__cardGrid" columns={3} responsive={true}>
          <EuiFlexItem>
            <EuiCard
              className="inpEmptyState__card"
              href="#/home/tutorial_directory"
              icon={<EuiIcon size="xl" type="database" color="subdued" />}
              title={
                <FormattedMessage
                  id="kbn.management.emptyState.integrationCardTitle"
                  defaultMessage="Add integration"
                />
              }
              description={
                <FormattedMessage
                  id="kbn.management.emptyState.integrationCardDescription"
                  defaultMessage="Add data from a variety of sources."
                />
              }
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCard
              className="inpEmptyState__card"
              betaBadgeLabel={i18n.translate('kbn.management.emptyState.basicLicenseLabel', {
                defaultMessage: 'Basic license',
              })}
              betaBadgeTooltipContent={i18n.translate(
                'kbn.management.emptyState.basicLicenseDescription',
                {
                  defaultMessage: 'Requires a Basic license',
                }
              )}
              isDisabled
              icon={<EuiIcon size="xl" type="document" color="subdued" />}
              title={
                <FormattedMessage
                  id="kbn.management.emptyState.uploadCardTitle"
                  defaultMessage="Upload a file"
                />
              }
              description={
                <FormattedMessage
                  id="kbn.management.emptyState.uploadCardDescription"
                  defaultMessage="Import a CSV, NDJSON, or log file."
                />
              }
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCard
              className="inpEmptyState__card"
              href="#/home/tutorial_directory/sampleData"
              icon={<EuiIcon size="xl" type="heatmap" color="subdued" />}
              title={
                <FormattedMessage
                  id="kbn.management.emptyState.sampleDataCardTitle"
                  defaultMessage="Add sample data"
                />
              }
              description={
                <FormattedMessage
                  id="kbn.management.emptyState.sampleDataCardDescription"
                  defaultMessage="Load a data set and a Kibana dashboard."
                />
              }
            />
          </EuiFlexItem>
        </EuiFlexGrid>
        <EuiSpacer size="xxl" />
        <div className="inpEmptyState__footer">
          <EuiFlexGrid columns={3}>
            <EuiFlexItem className="inpEmptyState__footerFlexItem">
              <EuiDescriptionList
                listItems={[
                  {
                    title: (
                      <FormattedMessage
                        id="kbn.management.emptyState.learnMore"
                        defaultMessage="Want to learn more?"
                      />
                    ),
                    description: (
                      <EuiLink href={getDocLink('kibana')} target="_blank" external>
                        Read documentation
                      </EuiLink>
                    ),
                  },
                ]}
              />
            </EuiFlexItem>
            <EuiFlexItem className="inpEmptyState__footerFlexItem">
              <EuiDescriptionList
                listItems={[
                  {
                    title: (
                      <FormattedMessage
                        id="kbn.management.emptyState.haveData"
                        defaultMessage="Pretty sure you have data?"
                      />
                    ),
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
          </EuiFlexGrid>
        </div>
      </EuiPageContentBody>
    </EuiPageContent>
  );
};
