import type { DataView } from '@kbn/data-views-plugin/public';
export type ShouldShowFieldInTableHandler = (fieldName: string) => boolean;
/**
 * Returns a function for checking whether we should display a field in the Documents column of the data table
 * If showMultiFields is set to false, it filters out multifields that have a parent, to prevent entries for multifields
 * like this: field, field.keyword, field.whatever
 * @param fields
 * @param dataView
 * @param showMultiFields
 */
export declare const getShouldShowFieldHandler: (fields: string[], dataView: DataView, showMultiFields: boolean) => ShouldShowFieldInTableHandler;
