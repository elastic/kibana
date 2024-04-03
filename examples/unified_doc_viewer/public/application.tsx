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
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { DataView } from '@kbn/data-views-plugin/common';
import { UnifiedDocViewer } from '@kbn/unified-doc-viewer-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { StartDeps } from './plugin';

export const renderApp = (
  core: CoreStart,
  { data }: StartDeps,
  { element }: AppMountParameters
) => {
  ReactDOM.render(<UnifiedDocViewerExamplesApp data={data} />, element);

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};

function UnifiedDocViewerExamplesApp({ data }: { data: DataPublicPluginStart }) {
  const [dataView, setDataView] = useState<DataView | null>();
  const [hit, setHit] = useState<DataTableRecord | null>();

  useEffect(() => {
    data.dataViews.getDefault().then((defaultDataView) => setDataView(defaultDataView));
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
        <UnifiedDocViewer hit={hit} dataView={dataView} />
      ) : (
        'Loading... (make sure you have a default data view and at least one matching document)'
      )}
    </>
  );
}
