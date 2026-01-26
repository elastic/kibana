/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { withSuspense } from '@kbn/shared-ux-utility';
import { lazy } from 'react';
import type { CascadedDocumentsLayoutProps } from './cascaded_document_layout';

export { useGetGroupBySelectorRenderer } from './blocks/use_table_header_components';
export type { ESQLDataCascadeProps } from './cascaded_document_layout';
export {
  type CascadedDocumentsContext,
  CascadedDocumentsProvider,
  isCascadedDocumentsVisible,
  useCascadedDocumentsContext,
} from './cascaded_documents_provider';

/**
 * exported as a lazy component to avoid loading the component until it is needed,
 * especially that it only renders for specific use cases (when cascade grouping is enabled).
 */
export const LazyCascadedDocumentsLayout = withSuspense<CascadedDocumentsLayoutProps>(
  lazy(() =>
    import('./cascaded_document_layout').then(({ CascadedDocumentsLayout }) => {
      return {
        default: CascadedDocumentsLayout,
      };
    })
  )
);
