import { type CoreStart } from '@kbn/core-lifecycle-browser';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { type DataViewsContract } from '@kbn/data-views-plugin/public';
import { type UseNewFieldsParams } from './use_new_fields';
import type { AdditionalFieldGroups } from '../types';
import { type FieldListGroups, type FieldListItem, type OverrideFieldGroupDetails, ExistenceFetchStatus } from '../types';
import { type FieldFiltersResult, type FieldFiltersParams } from './use_field_filters';
export interface GroupedFieldsParams<T extends FieldListItem> {
    dataViewId: string | null;
    allFields: T[] | null;
    services: {
        dataViews: DataViewsContract;
        core: Pick<CoreStart, 'docLinks'>;
    };
    isAffectedByGlobalFilter?: boolean;
    popularFieldsLimit?: number;
    sortedSelectedFields?: T[];
    getCustomFieldType?: FieldFiltersParams<T>['getCustomFieldType'];
    onOverrideFieldGroupDetails?: OverrideFieldGroupDetails;
    onSupportedFieldFilter?: (field: T) => boolean;
    onSelectedFieldFilter?: (field: T) => boolean;
    getNewFieldsBySpec?: UseNewFieldsParams<T>['getNewFieldsBySpec'];
    additionalFieldGroups?: AdditionalFieldGroups;
}
export interface GroupedFieldsResult<T extends FieldListItem> {
    fieldListFiltersProps: FieldFiltersResult<T>['fieldListFiltersProps'];
    fieldListGroupedProps: {
        fieldGroups: FieldListGroups<T>;
        scrollToTopResetCounter: number;
        fieldsExistenceStatus: ExistenceFetchStatus;
        fieldsExistInIndex: boolean;
        screenReaderDescriptionId?: string;
    };
    allFieldsModified: T[] | null;
    hasNewFields: boolean;
}
export declare function useGroupedFields<T extends FieldListItem = DataViewField>({ dataViewId, allFields, services, isAffectedByGlobalFilter, popularFieldsLimit, sortedSelectedFields, getCustomFieldType, onOverrideFieldGroupDetails, onSupportedFieldFilter, onSelectedFieldFilter, getNewFieldsBySpec, additionalFieldGroups, }: GroupedFieldsParams<T>): GroupedFieldsResult<T>;
