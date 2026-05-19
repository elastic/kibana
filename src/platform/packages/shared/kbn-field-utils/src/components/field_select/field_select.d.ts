import React from 'react';
import type { DocLinksStart } from '@kbn/core/public';
export interface FieldSelectProps {
    selectedType: string | null;
    onTypeChange: (type: string | null) => void;
    docLinks?: DocLinksStart;
}
/**
 * A ComboBox component for selecting field types.
 * Renders icons next to field types and groups them into categories.
 */
export declare const FieldSelect: ({ selectedType, onTypeChange, docLinks, ...restOfProps }: FieldSelectProps) => React.JSX.Element;
