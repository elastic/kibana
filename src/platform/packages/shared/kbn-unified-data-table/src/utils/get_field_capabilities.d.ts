import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
export declare const getFieldCapabilities: (dataView: DataView, field: DataViewField) => {
    canEdit: boolean;
    canDelete: boolean;
};
