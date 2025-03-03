/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { ContentClientProvider, type ContentClient } from '@kbn/content-management-plugin/public';
import { TableListViewKibanaProvider } from '@kbn/content-management-table-list-view-table';
import type { CoreStart } from '@kbn/core/public';
import { FormattedRelative, I18nProvider } from '@kbn/i18n-react';
import { SavedObjectTaggingOssPluginStart } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { MSearchTable } from './msearch_table';

export const MSearchApp = (props: {
  contentClient: ContentClient;
  core: CoreStart;
  savedObjectsTagging: SavedObjectTaggingOssPluginStart;
}) => {
  return (
    <ContentClientProvider contentClient={props.contentClient}>
      <I18nProvider>
        <TableListViewKibanaProvider
          core={props.core}
          FormattedRelative={FormattedRelative}
          savedObjectsTagging={props.savedObjectsTagging.getTaggingApi()}
        >
          <MSearchTable />
        </TableListViewKibanaProvider>
      </I18nProvider>
    </ContentClientProvider>
  );
};
