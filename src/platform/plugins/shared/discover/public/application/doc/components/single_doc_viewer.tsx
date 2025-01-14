/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { UnifiedDocViewer } from '@kbn/unified-doc-viewer-plugin/public';
import type { DocViewsRegistry } from '@kbn/unified-doc-viewer';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { DataView } from '@kbn/data-views-plugin/public';
import { useProfileAccessor } from '../../../context_awareness';

interface SingleDocViewerProps {
  record: DataTableRecord;
  dataView: DataView;
}

export const SingleDocViewer: React.FC<SingleDocViewerProps> = ({ record, dataView }) => {
  const getDocViewerAccessor = useProfileAccessor('getDocViewer', {
    record,
  });
  const docViewer = useMemo(() => {
    const getDocViewer = getDocViewerAccessor(() => ({
      title: undefined,
      docViewsRegistry: (registry: DocViewsRegistry) => registry,
    }));

    return getDocViewer({ record });
  }, [getDocViewerAccessor, record]);

  return (
    <UnifiedDocViewer
      hit={record}
      dataView={dataView}
      hideActionsColumn
      docViewsRegistry={docViewer.docViewsRegistry}
    />
  );
};
