import React from 'react';
import type { FindFieldsMetadataResponsePayload } from '@kbn/fields-metadata-plugin/common/latest';
import type { ParsedMetricItem, UnifiedMetricsGridProps } from '../../types';
export interface FieldsMetadataContext {
    fieldsMetadata: FindFieldsMetadataResponsePayload['fields'] | undefined;
    isFieldsMetadataLoading: boolean;
}
declare const FieldsMetadataContext: React.Context<FieldsMetadataContext>;
declare function FieldsMetadataProvider({ children, fields, services, }: {
    children: React.ReactNode;
    fields: ParsedMetricItem[];
} & Pick<UnifiedMetricsGridProps, 'services'>): React.JSX.Element;
export { FieldsMetadataProvider, FieldsMetadataContext };
