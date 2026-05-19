import React from 'react';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
export declare const SHOULD_TRUNCATE_FIELD_DESCRIPTION_LOCALSTORAGE_KEY = "fieldDescription:truncateByDefault";
export interface FieldDescriptionContentProps {
    field: {
        name: string;
        customDescription?: string;
        type: string;
    };
    color?: 'subdued';
    truncate?: boolean;
    Wrapper?: React.FC<{
        children: React.ReactNode;
    }>;
}
export interface FieldDescriptionProps extends FieldDescriptionContentProps {
    fieldsMetadataService?: FieldsMetadataPublicStart;
    streamNames?: string[];
}
export declare const FieldDescription: React.FC<FieldDescriptionProps>;
export declare const FieldDescriptionContent: React.FC<FieldDescriptionContentProps & {
    description?: string;
}>;
