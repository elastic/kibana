import type { RowControlColumn, RowControlProps } from './types';
interface DegradedDocsControlProps extends Partial<RowControlProps> {
    enabled?: boolean;
    addIgnoredMetadataToQuery?: () => void;
}
/**
 * Degraded docs control factory function.
 * @param props Optional props for the generated Control component, useful to override onClick, etc
 */
export declare const createDegradedDocsControl: (props?: DegradedDocsControlProps) => RowControlColumn;
export {};
