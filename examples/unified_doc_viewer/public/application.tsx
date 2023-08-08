/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { DocViewer } from '@kbn/unified-doc-viewer';
import { getDocViewsRegistry } from '@kbn/unified-doc-viewer-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { DataView } from '@kbn/data-views-plugin/common';
import {
  UnifiedDocViewerServices,
  useUnifiedDocViewerServices,
} from '@kbn/unified-doc-viewer-plugin/public/hooks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { DataTableRecord } from '@kbn/discover-utils/src/types';
import type { StartDeps } from './plugin';

export const renderApp = (core: CoreStart, deps: StartDeps, { element }: AppMountParameters) => {
  const { analytics, uiSettings } = core;
  const { data, fieldFormats } = deps;
  const storage = new Storage(localStorage);
  const services: UnifiedDocViewerServices = { analytics, data, fieldFormats, storage, uiSettings };
  ReactDOM.render(
    <KibanaContextProvider services={services}>
      <UnifiedDocViewerExamplesApp />
    </KibanaContextProvider>,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};

function UnifiedDocViewerExamplesApp() {
  const { data } = useUnifiedDocViewerServices();
  const [dataView, setDataView] = useState<DataView | null>();
  const [hit, setHit] = useState<DataTableRecord | null>();

  useEffect(() => {
    const setDefaultDataView = async () => {
      const defaultDataView = await data.dataViews.getDefault();
      setDataView(defaultDataView);
    };

    setDefaultDataView();
  }, [data]);

  useEffect(() => {
    const setDefaultHit = async () => {
      if (!dataView?.id) return;
      const response = await data.search
        .search({
          params: {
            index: dataView?.getIndexPattern(),
            body: {
              fields: ['*'],
              _source: false,
            },
          },
        })
        .toPromise();
      const docs = response?.rawResponse?.hits?.hits ?? [];
      if (docs.length > 0) {
        const record = buildDataTableRecord(docs[0], dataView);
        setHit(record);
      }
    };

    setDefaultHit();
  }, [data, dataView]);

  return (
    <>
      {dataView?.id && hit ? (
        <DocViewer docViewsRegistry={getDocViewsRegistry()} hit={hit} dataView={dataView} />
      ) : (
        'Loading... (make sure you have a default data view and at least one matching document)'
      )}
    </>
  );
}
