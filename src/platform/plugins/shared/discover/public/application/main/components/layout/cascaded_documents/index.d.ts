import type { CascadedDocumentsLayoutProps } from './cascaded_document_layout';
export { useGetGroupBySelectorRenderer } from './blocks/use_table_header_components';
export type { ESQLDataCascadeProps } from './cascaded_document_layout';
export { type CascadedDocumentsContext, type CascadedDocumentsDataGridUiStateMap, CascadedDocumentsProvider, isCascadedDocumentsVisible, useCascadedDocumentsContext, } from './cascaded_documents_provider';
/**
 * exported as a lazy component to avoid loading the component until it is needed,
 * especially that it only renders for specific use cases (when cascade grouping is enabled).
 */
export declare const LazyCascadedDocumentsLayout: import("react").ForwardRefExoticComponent<CascadedDocumentsLayoutProps & import("@kbn/shared-ux-utility").WithSuspenseExtendedDeps & import("react").RefAttributes<{}>>;
