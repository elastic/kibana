import React from 'react';
import { type EuiFieldSearchProps } from '@elastic/eui';
/**
 * Props for FieldNameSearch component
 */
export interface FieldNameSearchProps {
    'data-test-subj': string;
    append?: EuiFieldSearchProps['append'];
    compressed?: EuiFieldSearchProps['compressed'];
    nameFilter: string;
    screenReaderDescriptionId?: string;
    onChange: (nameFilter: string) => unknown;
    onFocus?: () => void;
    onBlur?: () => void;
}
/**
 * Search input for fields list
 * @param dataTestSubject
 * @param append
 * @param compressed
 * @param nameFilter
 * @param screenReaderDescriptionId
 * @param onChange
 * @constructor
 */
export declare const FieldNameSearch: React.FC<FieldNameSearchProps>;
