import type { EuiListGroupItemProps } from '@elastic/eui';
import type { ToastsStart } from '@kbn/core/public';
import type { ValueToStringConverter } from '../types';
export declare function buildCopyColumnNameButton({ columnDisplayName, toastNotifications, }: {
    columnDisplayName: string;
    toastNotifications: ToastsStart;
}): EuiListGroupItemProps;
export declare function buildCopyColumnValuesButton({ columnId, columnDisplayName, toastNotifications, rowsCount, valueToStringConverter, }: {
    columnId: string;
    columnDisplayName: string;
    toastNotifications: ToastsStart;
    rowsCount: number;
    valueToStringConverter: ValueToStringConverter;
}): EuiListGroupItemProps;
