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
import { CoreStart, ChromeBreadcrumb } from '@kbn/core/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataViewsContract } from '@kbn/data-views-plugin/public';
import { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { AllowedPluginSource } from '../../common/types';
import {
  SavedObjectsManagementActionServiceStart,
  SavedObjectsManagementColumnServiceStart,
} from '../services';
import { PluginsTable } from './objects_table';

const PluginsTablePage = ({
  coreStart,
  dataStart,
  dataViewsApi,
  taggingApi,
  allowedSources,
  actionRegistry,
  columnRegistry,
  setBreadcrumbs,
}: {
  coreStart: CoreStart;
  dataStart: DataPublicPluginStart;
  dataViewsApi: DataViewsContract;
  taggingApi?: SavedObjectsTaggingApi;
  allowedSources: AllowedPluginSource[];
  actionRegistry: SavedObjectsManagementActionServiceStart;
  columnRegistry: SavedObjectsManagementColumnServiceStart;
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
}) => {
  const { capabilities } = coreStart.application;
  const itemsPerPage = coreStart.uiSettings.get<number>('pluginsManagement:perPage', 50);
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
        text: i18n.translate('pluginsManagement.breadcrumb.index', {
          defaultMessage: 'Plugins Management',
        }),
      },
    ]);
  }, [setBreadcrumbs]);

  return (
    <PluginsTable
      initialQuery={initialQuery}
      allowedSources={allowedSources}
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
      goInspectObject={(plugin) => {
        const savedObjectEditUrl = `/app/management/kibana/plugins/${plugin.pluginName}`;
        coreStart.application.navigateToUrl(coreStart.http.basePath.prepend(savedObjectEditUrl));
      }}
      canGoInApp={() => {
        return false;
      }}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { PluginsTablePage as default };
