import React from 'react';
import { type UnifiedDataTableProps } from '@kbn/unified-data-table';
import type { DiscoverAppState } from '../../application/main/state_management/redux';
import type { CascadedDocumentsContext } from '../../application/main/components/layout/cascaded_documents';
export interface DiscoverGridProps extends UnifiedDataTableProps {
    query?: DiscoverAppState['query'];
    cascadedDocumentsContext?: CascadedDocumentsContext;
}
/**
 * Customized version of the UnifiedDataTable
 * @constructor
 */
export declare const DiscoverGrid: React.FC<DiscoverGridProps>;
