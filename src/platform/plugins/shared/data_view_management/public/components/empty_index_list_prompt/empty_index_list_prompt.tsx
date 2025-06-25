/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiPanel,
  EuiPageHeader,
  EuiTitle,
  EuiIcon,
  EuiSpacer,
  EuiFlexItem,
  EuiDescriptionList,
  EuiFlexGrid,
  EuiCard,
  EuiLink,
  EuiText,
  EuiFlexGroup,
} from '@elastic/eui';
import { ApplicationStart } from '@kbn/core/public';
import { euiThemeVars } from '@kbn/ui-theme';

export const EmptyIndexListPrompt = ({
  onRefresh,
  createAnyway,
  canSaveIndexPattern,
  addDataUrl,
  navigateToApp,
}: {
  onRefresh: () => void;
  createAnyway: () => void;
  canSaveIndexPattern: boolean;
  addDataUrl: string;
  navigateToApp: ApplicationStart['navigateToApp'];
}) => {
  const createAnywayLink = (
    <EuiText color="subdued" textAlign="center" size="xs">
      <FormattedMessage
        id="indexPatternManagement.createDataView.emptyState.createAnywayTxt"
        defaultMessage="You can also {link}"
        values={{
          link: (
            <EuiLink onClick={() => createAnyway()} data-test-subj="createAnyway">
              <FormattedMessage
                id="indexPatternManagement.createDataView.emptyState.createAnywayLink"
                defaultMessage="create a data view against hidden, system or default indices."
              />
            </EuiLink>
          ),
        }}
      />
    </EuiText>
  );

  return (
    <EuiPanel
      data-test-subj="indexPatternEmptyState"
      color="subdued"
      hasShadow={false}
      paddingSize="xl"
      css={styles.wrapper}
    >
      <EuiPageHeader>
        <EuiTitle>
          <h2>
            <FormattedMessage
              id="indexPatternManagement.createDataView.emptyState.noDataTitle"
              defaultMessage="Ready to try Kibana? First, you need data."
            />
          </h2>
        </EuiTitle>
      </EuiPageHeader>
      <EuiSpacer size="xl" />
      <div>
        <EuiFlexGrid css={styles.cardGrid} columns={3} responsive={true}>
          <EuiFlexItem>
            <EuiCard
              css={styles.card}
              onClick={() => {
                navigateToApp('integrations', { path: '/browse' });
              }}
              icon={<EuiIcon size="xl" type="database" color="subdued" />}
              title={
                <FormattedMessage
                  id="indexPatternManagement.createDataView.emptyState.integrationCardTitle"
                  defaultMessage="Add integration"
                />
              }
              description={
                <FormattedMessage
                  id="indexPatternManagement.createDataView.emptyState.integrationCardDescription"
                  defaultMessage="Add data from a variety of sources."
                />
              }
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCard
              onClick={() => navigateToApp('home', { path: '#/tutorial_directory/fileDataViz' })}
              css={styles.card}
              icon={<EuiIcon size="xl" type="document" color="subdued" />}
              title={
                <FormattedMessage
                  id="indexPatternManagement.createDataView.emptyState.uploadCardTitle"
                  defaultMessage="Upload a file"
                />
              }
              description={
                <FormattedMessage
                  id="indexPatternManagement.createDataView.emptyState.uploadCardDescription"
                  defaultMessage="Import a CSV, NDJSON, or log file."
                />
              }
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCard
              css={styles.card}
              onClick={() => {
                navigateToApp('home', { path: '#/tutorial_directory/sampleData' });
              }}
              icon={<EuiIcon size="xl" type="heatmap" color="subdued" />}
              title={
                <FormattedMessage
                  id="indexPatternManagement.createDataView.emptyState.sampleDataCardTitle"
                  defaultMessage="Add sample data"
                />
              }
              description={
                <FormattedMessage
                  id="indexPatternManagement.createDataView.emptyState.sampleDataCardDescription"
                  defaultMessage="Load a data set and a Kibana dashboard."
                />
              }
            />
          </EuiFlexItem>
        </EuiFlexGrid>
        <EuiSpacer size="xxl" />
        <div css={styles.footer}>
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false} css={styles.footerItem}>
              <EuiDescriptionList
                listItems={[
                  {
                    title: (
                      <FormattedMessage
                        id="indexPatternManagement.createDataView.emptyState.learnMore"
                        defaultMessage="Want to learn more?"
                      />
                    ),
                    description: (
                      <EuiLink href={addDataUrl} target="_blank" external>
                        <FormattedMessage
                          id="indexPatternManagement.createDataView.emptyState.readDocs"
                          defaultMessage="Read documentation"
                        />
                      </EuiLink>
                    ),
                  },
                ]}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false} css={styles.footerItem}>
              <EuiDescriptionList
                listItems={[
                  {
                    title: (
                      <FormattedMessage
                        id="indexPatternManagement.createDataView.emptyState.haveData"
                        defaultMessage="Think you already have data?"
                      />
                    ),
                    description: (
                      <EuiLink onClick={onRefresh} data-test-subj="refreshIndicesButton">
                        <FormattedMessage
                          id="indexPatternManagement.createDataView.emptyState.checkDataButton"
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
          <EuiSpacer />
          {canSaveIndexPattern && createAnywayLink}
        </div>
      </div>
    </EuiPanel>
  );
};

const styles = {
  wrapper: css({
    maxWidth: `calc(${euiThemeVars.euiSizeXXL} * 19)`,
    margin: 'auto',
  }),
  cardGrid: css({
    justifyContent: 'center',
  }),
  card: css({
    minWidth: `calc(${euiThemeVars.euiSizeXL} * 6)`,
  }),
  footer: css({
    backgroundColor: euiThemeVars.euiColorLightestShade,
    margin: `0 -${euiThemeVars.euiSizeL} -${euiThemeVars.euiSizeL}`,
    padding: euiThemeVars.euiSizeL,
    borderRadius: `0 0 ${euiThemeVars.euiBorderRadiusSmall} ${euiThemeVars.euiBorderRadiusSmall}`,
  }),
  footerItem: css({
    minWidth: `calc(${euiThemeVars.euiSizeXL} * 7)`,
  }),
};
