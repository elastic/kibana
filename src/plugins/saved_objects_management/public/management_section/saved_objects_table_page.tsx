/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Query } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { parse } from 'query-string';
import React, { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import type { CoreStart } from '../../../../core/public/types';
import type { ChromeBreadcrumb } from '../../../../core/public/chrome/types';
import type { DataPublicPluginStart } from '../../../data/public/types';
import type { SavedObjectsTaggingApi } from '../../../saved_objects_tagging_oss/public/api';
import type { SpacesContextProps } from '../../../spaces_oss/public/api';
import type { SpacesAvailableStartContract } from '../../../spaces_oss/public/types';
import type { SavedObjectsManagementActionServiceStart } from '../services/action_service';
import type { SavedObjectsManagementColumnServiceStart } from '../services/column_service';
import type { ISavedObjectsManagementServiceRegistry } from '../services/service_registry';
import { SavedObjectsTable } from './objects_table/saved_objects_table';

const getEmptyFunctionComponent: React.FC<SpacesContextProps> = ({ children }) => <>{children}</>;

const SavedObjectsTablePage = ({
  coreStart,
  dataStart,
  taggingApi,
  spacesApi,
  allowedTypes,
  serviceRegistry,
  actionRegistry,
  columnRegistry,
  setBreadcrumbs,
}: {
  coreStart: CoreStart;
  dataStart: DataPublicPluginStart;
  taggingApi?: SavedObjectsTaggingApi;
  spacesApi?: SpacesAvailableStartContract;
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
