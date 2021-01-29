/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { get } from 'lodash';
import { Query } from '@elastic/eui';
import { parse } from 'query-string';
import { i18n } from '@kbn/i18n';
import { CoreStart, ChromeBreadcrumb } from 'src/core/public';
import { DataPublicPluginStart } from '../../../data/public';
import { SavedObjectsTaggingApi } from '../../../saved_objects_tagging_oss/public';
import {
  ISavedObjectsManagementServiceRegistry,
  SavedObjectsManagementActionServiceStart,
  SavedObjectsManagementColumnServiceStart,
} from '../services';
import { SavedObjectsTable } from './objects_table';

const SavedObjectsTablePage = ({
  coreStart,
  dataStart,
  taggingApi,
  allowedTypes,
  serviceRegistry,
  actionRegistry,
  columnRegistry,
  setBreadcrumbs,
}: {
  coreStart: CoreStart;
  dataStart: DataPublicPluginStart;
  taggingApi?: SavedObjectsTaggingApi;
  allowedTypes: string[];
  serviceRegistry: ISavedObjectsManagementServiceRegistry;
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
        href: '/',
      },
    ]);
  }, [setBreadcrumbs]);

  return (
    <SavedObjectsTable
      initialQuery={initialQuery}
      allowedTypes={allowedTypes}
      serviceRegistry={serviceRegistry}
      actionRegistry={actionRegistry}
      columnRegistry={columnRegistry}
      taggingApi={taggingApi}
      savedObjectsClient={coreStart.savedObjects.client}
      indexPatterns={dataStart.indexPatterns}
      search={dataStart.search}
      http={coreStart.http}
      overlays={coreStart.overlays}
      notifications={coreStart.notifications}
      applications={coreStart.application}
      perPageConfig={itemsPerPage}
      goInspectObject={(savedObject) => {
        const { editUrl } = savedObject.meta;
        if (editUrl) {
          return coreStart.application.navigateToUrl(
            coreStart.http.basePath.prepend(`/app${editUrl}`)
          );
        }
      }}
      canGoInApp={(savedObject) => {
        const { inAppUrl } = savedObject.meta;
        return inAppUrl ? Boolean(get(capabilities, inAppUrl.uiCapabilitiesPath)) : false;
      }}
    />
  );
};
// eslint-disable-next-line import/no-default-export
export { SavedObjectsTablePage as default };
