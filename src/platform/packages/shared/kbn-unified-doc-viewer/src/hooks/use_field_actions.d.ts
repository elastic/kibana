import type { IconType } from '@elastic/eui';
import { copyToClipboard } from '@elastic/eui';
import type { DocViewRenderProps } from '../types';
import type { FieldMapping } from '../services/types';
interface WithFieldParam {
    field: string;
    mapping?: FieldMapping;
}
interface WithValueParam {
    value: unknown;
}
interface FieldActionParams extends WithFieldParam, WithValueParam {
    formattedValue?: string;
}
export interface TFieldAction {
    id: string;
    iconType: IconType;
    label: string;
    onClick: () => void;
}
export type UseFieldActionsDeps = Pick<DocViewRenderProps, 'columns' | 'filter' | 'onAddColumn' | 'onRemoveColumn'>;
export declare const FieldActionsProvider: import("react").FC<import("react").PropsWithChildren<UseFieldActionsDeps>>, useFieldActionsContext: () => {
    addColumn: ((columnName: string) => void) | undefined;
    addFilterExist: ({ field }: WithFieldParam) => void | undefined;
    addFilterIn: ({ field, value, mapping }: FieldActionParams) => void | undefined;
    addFilterOut: ({ field, value, mapping }: FieldActionParams) => void | undefined;
    copyToClipboard: typeof copyToClipboard;
    removeColumn: ((columnName: string) => void) | undefined;
    isColumnAdded: ({ field }: WithFieldParam) => boolean;
    toggleFieldColumn: ({ field }: WithFieldParam) => void;
};
export declare const useUIFieldActions: ({ field, value, mapping, formattedValue, }: FieldActionParams) => TFieldAction[];
export {};
