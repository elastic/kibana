import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
/**
 * This function returns the categorization field from the list of fields.
 * It checks for the presence of 'message', 'error.message', or 'event.original' in that order.
 * If none of these fields are present, it returns the first field from the list,
 * Assumes text fields have been passed in the `fields` array.
 *
 * @param fields, the list of fields to check
 * @returns string | undefined, the categorization field if found, otherwise undefined
 */
export declare function getCategorizationField(fields: string[]): string | undefined;
/**
 * This function returns the categorization field from the DataView.
 * It checks for the presence of 'message', 'error.message', or 'event.original' in that order.
 * If none of these fields are present, it returns the first text field from the DataView.
 *
 * @param dataView, the DataView to check
 * @returns an object containing the message field DataViewField and dataViewFields
 */
export declare function getCategorizationDataViewField(dataView: DataView): {
    messageField: DataViewField | null;
    dataViewFields: DataViewField[];
};
