/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { get } from 'lodash';
import { Query } from '@elastic/eui';
import { parse } from 'query-string';
import { i18n } from '@kbn/i18n';
import { CoreStart, ChromeBreadcrumb } from 'src/core/public';
import type { SpacesApi, SpacesContextProps } from '../../../../../x-pack/plugins/spaces/public';
import { DataPublicPluginStart } from '../../../data/public';
import { DataViewsContract } from '../../../data_views/public';
import { SavedObjectsTaggingApi } from '../../../saved_objects_tagging_oss/public';
import type { SavedObjectManagementTypeInfo } from '../../common/types';
import {
  SavedObjectsManagementActionServiceStart,
  SavedObjectsManagementColumnServiceStart,
} from '../services';
import { SavedObjectsTable } from './objects_table';

const getEmptyFunctionComponent: React.FC<SpacesContextProps> = ({ children }) => <>{children}</>;

const SavedObjectsTablePage = ({
  coreStart,
  dataStart,
  dataViewsApi,
  taggingApi,
  spacesApi,
  allowedTypes,
  actionRegistry,
  columnRegistry,
  setBreadcrumbs,
}: {
  coreStart: CoreStart;
  dataStart: DataPublicPluginStart;
  dataViewsApi: DataViewsContract;
  taggingApi?: SavedObjectsTaggingApi;
  spacesApi?: SpacesApi;
  allowedTypes: SavedObjectManagementTypeInfo[];
  actionRegistry: SavedObjectsManagementActionServiceStart;
  columnRegistry: SavedObjectsManagementColumnServiceStart;
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
}) => {
  const capabilities = coreStart.application.capabilities;
  const itemsPerPage = coreStart.uiSettings.get<number>('savedObjects:perPage', 50);
  const { search } = useLocation();

  const initialQuery = useMemo(() => {
    const query = parse(search);
    try {
      return Query.parse((query.initialQuery as string) ?? '');
    } catch (e) {
      return Query.parse('');
    }
  }, [search]);

  useEffect(() => {
    setBreadcrumbs([
      {
        text: i18n.translate('savedObjectsManagement.breadcrumb.index', {
          defaultMessage: 'Saved objects',
        }),
      },
    ]);
  }, [setBreadcrumbs]);

  const ContextWrapper = useMemo(
    () =>
      spacesApi ? spacesApi.ui.components.getSpacesContextProvider : getEmptyFunctionComponent,
    [spacesApi]
  );
  return (
    <ContextWrapper>
      <SavedObjectsTable
        initialQuery={initialQuery}
        allowedTypes={allowedTypes}
        actionRegistry={actionRegistry}
        columnRegistry={columnRegistry}
        taggingApi={taggingApi}
        savedObjectsClient={coreStart.savedObjects.client}
        dataViews={dataViewsApi}
        search={dataStart.search}
        http={coreStart.http}
        overlays={coreStart.overlays}
        notifications={coreStart.notifications}
        applications={coreStart.application}
        perPageConfig={itemsPerPage}
        goInspectObject={(savedObject) => {
          const savedObjectEditUrl = savedObject.meta.editUrl
            ? `/app${savedObject.meta.editUrl}`
            : `/app/management/kibana/objects/${savedObject.type}/${savedObject.id}`;
          coreStart.application.navigateToUrl(coreStart.http.basePath.prepend(savedObjectEditUrl));
        }}
        canGoInApp={(savedObject) => {
          const { inAppUrl } = savedObject.meta;
          if (!inAppUrl) return false;
          if (!inAppUrl.uiCapabilitiesPath) return true;
          return Boolean(get(capabilities, inAppUrl.uiCapabilitiesPath));
        }}
      />
    </ContextWrapper>
  );
};
// eslint-disable-next-line import/no-default-export
export { SavedObjectsTablePage as default };
