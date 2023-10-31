/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { UnifiedDataTable, type UnifiedDataTableProps } from '@kbn/unified-data-table';
import { renderCustomToolbar } from './render_custom_toolbar';

/**
 * Customized version of the UnifiedDataTable
 * @param props
 * @constructor
 */
export const DiscoverGrid: React.FC<UnifiedDataTableProps> = (props) => {
  return <UnifiedDataTable showColumnTokens renderCustomToolbar={renderCustomToolbar} {...props} />;
};
