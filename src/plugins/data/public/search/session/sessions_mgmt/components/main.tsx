/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButtonEmpty, EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CoreStart, HttpStart } from 'kibana/public';
import React from 'react';
import type { SearchSessionsMgmtAPI } from '../lib/api';
import type { AsyncSearchIntroDocumentation } from '../lib/documentation';
import { SearchSessionsMgmtTable } from './table';
import { SearchSessionsConfigSchema } from '../../../../../config';
import { SearchUsageCollector } from '../../../collectors';

interface Props {
  documentation: AsyncSearchIntroDocumentation;
  core: CoreStart;
  api: SearchSessionsMgmtAPI;
  http: HttpStart;
  timezone: string;
  config: SearchSessionsConfigSchema;
  kibanaVersion: string;
  searchUsageCollector: SearchUsageCollector;
}

export function SearchSessionsMgmtMain({ documentation, ...tableProps }: Props) {
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
            iconType="help"
          >
            <FormattedMessage
              id="data.mgmt.searchSessions.main.backgroundSessionsDocsLinkText"
              defaultMessage="Documentation"
            />
          </EuiButtonEmpty>,
        ]}
      />

      <EuiSpacer size="l" />
      <SearchSessionsMgmtTable data-test-subj="search-sessions-mgmt-table" {...tableProps} />
    </>
  );
}
