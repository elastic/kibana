/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import { DocViewerSource } from '@kbn/unified-doc-viewer/public';
import { CodeEditor } from '@kbn/kibana-react-plugin/public';
import { useEsDocSearch } from '@kbn/unified-doc-viewer/public/hooks';

export interface SourceViewerProps {
  id: string;
  index: string;
  dataView: DataView;
  hasLineNumbers: boolean;
  width?: number;
  useNewFieldsApi: boolean;
  useDocExplorer: boolean;
}

// Required for usage in React.lazy
// eslint-disable-next-line import/no-default-export
export default function ({ id, index, dataView, useNewFieldsApi, ...props }: SourceViewerProps) {
  const [reqState, hit, requestData] = useEsDocSearch({
    id,
    index,
    dataView,
    requestSource: useNewFieldsApi,
  });
  return (
    <DocViewerSource
      CodeEditor={CodeEditor}
      requestState={reqState}
      hit={hit}
      onRefresh={requestData}
      {...props}
    />
  );
}
