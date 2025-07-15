/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import useAsync from 'react-use/lib/useAsync';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { ESQLEditorProps, ESQLEditorDeps } from '@kbn/esql-editor';
import {
  untilPluginStartServicesReady,
  coreServices,
  dataViewsService,
  dataService,
  uiActionsService,
  expressionsService,
  storageService,
  fieldsMetadataService,
  usageCollectionService,
} from '../../services/kibana_services';

export const ESQLLangEditor = (props: ESQLEditorProps) => {
  const { loading, value } = useAsync(() => {
    const startServicesPromise = untilPluginStartServicesReady();
    const modulePromise = import('@kbn/esql-editor');
    return Promise.all([startServicesPromise, modulePromise]);
  }, []);

  const depsLoaded = value?.[0];
  const ESQLEditor = value?.[1]?.default;

  if (loading || !depsLoaded || !ESQLEditor) return <EuiLoadingSpinner />;

  // TODO Add indexManagement as optional service if and when circular dependency issue with this plugin is fixed
  const services: ESQLEditorDeps = {
    core: coreServices,
    dataViews: dataViewsService,
    data: dataService,
    uiActions: uiActionsService,
    expressions: expressionsService,
    storage: storageService,
    fieldsMetadata: fieldsMetadataService,
    usageCollection: usageCollectionService,
  };

  return (
    <KibanaContextProvider
      services={{
        ...services,
      }}
    >
      <ESQLEditor {...props} />
    </KibanaContextProvider>
  );
};
