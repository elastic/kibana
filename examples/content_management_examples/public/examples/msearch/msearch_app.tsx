/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useMemo } from 'react';
import { SpacesContextProps, SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { ContentClientProvider, type ContentClient } from '@kbn/content-management-plugin/public';
import { TableListViewKibanaProvider } from '@kbn/content-management-table-list-view-table';
import type { CoreStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { FormattedRelative, I18nProvider } from '@kbn/i18n-react';
import { SavedObjectTaggingOssPluginStart } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { MSearchTable } from './msearch_table';

const getEmptyFunctionComponent: FC<SpacesContextProps> = ({ children }) => <>{children}</>;

export const MSearchApp = (props: {
  contentClient: ContentClient;
  core: CoreStart;
  savedObjectsTagging: SavedObjectTaggingOssPluginStart;
  spaces?: SpacesPluginStart;
}) => {
  const SpacesContextWrapper = useMemo(
    () =>
      props.spaces
        ? props.spaces.ui.components.getSpacesContextProvider
        : getEmptyFunctionComponent,
    [props.spaces]
  );

  return (
    <SpacesContextWrapper>
      <ContentClientProvider contentClient={props.contentClient}>
        <I18nProvider>
          <TableListViewKibanaProvider
            core={props.core}
            toMountPoint={toMountPoint}
            FormattedRelative={FormattedRelative}
            savedObjectsTagging={props.savedObjectsTagging.getTaggingApi()}
            spacesApi={props.spaces}
          >
            <MSearchTable />
          </TableListViewKibanaProvider>
        </I18nProvider>
      </ContentClientProvider>
    </SpacesContextWrapper>
  );
};
