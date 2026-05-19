import type { EuiListGroupItemProps } from '@elastic/eui';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
export declare const buildEditFieldButton: ({ hasEditDataViewPermission, dataView, field, editField, }: {
    hasEditDataViewPermission: () => boolean;
    dataView: DataView;
    field: DataViewField;
    editField: (fieldName: string) => void;
}) => EuiListGroupItemProps | null;
