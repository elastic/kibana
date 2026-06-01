import type { DataTableColumnsMeta } from '../types';
import * as formatValueModule from '../utils/format_value';
/**
 * Creates a data view with a bytes field typed as number.
 * Used for testing columnsMeta override scenarios where the data view
 * has a field but ES|QL returns it with a different type.
 */
export declare const createDataViewWithBytesField: () => import("@kbn/data-views-plugin/common").DataView;
/**
 * Creates a data view without a bytes field.
 * Used for testing scenarios where ES|QL returns a computed field
 * not present in the data view.
 */
export declare const createDataViewWithoutCustomField: () => import("@kbn/data-views-plugin/common").DataView;
/**
 * columnsMeta that overrides bytes from number to string/keyword.
 * Used for testing when ES|QL query returns a field with a different
 * type than defined in the data view.
 */
export declare const columnsMetaOverridingBytesType: DataTableColumnsMeta;
/**
 * columnsMeta for a custom ES|QL field not in the data view.
 */
export declare const columnsMetaWithCustomField: DataTableColumnsMeta;
/**
 * Creates a spy on formatFieldValueReact that returns 'formatted'.
 * Remember to call mockRestore() in afterEach.
 */
export declare const createFormatFieldValueReactSpy: () => jest.SpyInstance<import("react").ReactNode, [formatValueModule.FormatFieldValueReactParams], any>;
/**
 * Finds a call to formatFieldValueReact for a specific field name.
 * The field is passed as part of the object parameter.
 */
export declare const findFieldCallInSpy: (spy: jest.SpyInstance, fieldName: string) => any;
/**
 * Asserts that formatFieldValueReact was called with a field matching the expected properties.
 */
export declare const expectFieldCallToMatch: (spy: jest.SpyInstance, fieldName: string, expectedType: string, expectedEsTypes?: string[]) => void;
