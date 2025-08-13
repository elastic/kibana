/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButtonEmpty, EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CoreStart, HttpStart } from '@kbn/core/public';
import { SharePluginStart } from '@kbn/share-plugin/public';
import type { SearchSessionsMgmtAPI } from '../lib/api';
import type { AsyncSearchIntroDocumentation } from '../lib/documentation';
import { SearchSessionsMgmtTable } from './table';
import { SearchSessionsDeprecatedWarning } from '../../search_sessions_deprecation_message';
import type { SearchSessionsConfigSchema } from '../../../../../server/config';
import { SearchUsageCollector } from '../../../collectors';
import { BACKGROUND_SEARCH_ENABLED } from '../../constants';

interface Props {
  documentation: AsyncSearchIntroDocumentation;
  core: CoreStart;
  api: SearchSessionsMgmtAPI;
  http: HttpStart;
  timezone: string;
  config: SearchSessionsConfigSchema;
  kibanaVersion: string;
  share: SharePluginStart;
  searchUsageCollector: SearchUsageCollector;
}

export function SearchSessionsMgmtMain({ documentation, share, ...tableProps }: Props) {
  if (BACKGROUND_SEARCH_ENABLED) {
    return (
      <>
        <EuiPageHeader
          pageTitle={
            <FormattedMessage
              id="data.mgmt.searchSessions.main.backgroundSearchSectionTitle"
              defaultMessage="Background Search"
            />
          }
          description={
            <FormattedMessage
              id="data.mgmt.searchSessions.main.backgroundSearchSectionDescription"
              defaultMessage="Manage your background searches."
            />
          }
          bottomBorder
        />

        <EuiSpacer size="l" />
        <SearchSessionsMgmtTable
          data-test-subj="search-sessions-mgmt-table"
          locators={share.url.locators}
          {...tableProps}
        />
      </>
    );
  }

  return (
    <>
      <EuiPageHeader
        pageTitle={
          <FormattedMessage
            id="data.mgmt.searchSessions.main.sectionTitle"
            defaultMessage="Search Sessions"
          />
        }
        description={
          <FormattedMessage
            id="data.mgmt.searchSessions.main.sectionDescription"
            defaultMessage="Manage your saved search sessions."
          />
        }
        bottomBorder
        rightSideItems={[
          <EuiButtonEmpty
            href={documentation.getElasticsearchDocLink()}
            target="_blank"
            iconType="question"
          >
            <FormattedMessage
              id="data.mgmt.searchSessions.main.backgroundSessionsDocsLinkText"
              defaultMessage="Documentation"
            />
          </EuiButtonEmpty>,
        ]}
      />

      <EuiSpacer size="l" />
      <SearchSessionsDeprecatedWarning />

      <EuiSpacer size="l" />
      <SearchSessionsMgmtTable
        data-test-subj="search-sessions-mgmt-table"
        locators={share.url.locators}
        {...tableProps}
      />
    </>
  );
}
