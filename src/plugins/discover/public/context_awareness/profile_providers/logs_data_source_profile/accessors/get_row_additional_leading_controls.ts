/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createDegradedDocsControl, createStacktraceControl } from '@kbn/discover-utils';
import { retrieveMetadataColumns } from '@kbn/esql-utils';
import type { DataSourceProfileProvider } from '../../../profiles';
import { RowControlsExtensionParams } from '../../../types';

export const getRowAdditionalLeadingControls: DataSourceProfileProvider['profile']['getRowAdditionalLeadingControls'] =
  (prev) => (params) => {
    const additionalControls = prev(params) || [];
    const { query, dataView } = params;

    const isDegradedDocsControlEnabled =
      dataView.type === 'esql' ? queryContainsMetadataIgnored(query) : true;

    return [
      ...additionalControls,
      createDegradedDocsControl({ enabled: isDegradedDocsControlEnabled }),
      createStacktraceControl(),
    ];
  };

const queryContainsMetadataIgnored = (query?: RowControlsExtensionParams['query']) =>
  query && 'esql' in query && retrieveMetadataColumns(query.esql).includes('_ignored');
