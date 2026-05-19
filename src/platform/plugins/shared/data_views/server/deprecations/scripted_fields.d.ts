import type { CoreSetup, RegisterDeprecationsConfig } from '@kbn/core/server';
import type { DataViewAttributes } from '../../common';
type DataViewAttributesWithFields = Pick<DataViewAttributes, 'name' | 'title' | 'fields'>;
export declare const createScriptedFieldsDeprecationsConfig: (core: CoreSetup) => RegisterDeprecationsConfig;
export declare function hasScriptedField(dataView: DataViewAttributesWithFields): any;
export {};
