import type { DataViewFieldBase } from '../../es_query';
/**
 * @internal
 * See issues bellow for the reason behind this change.
 * Values need to be converted to correct types for boolean \ numeric fields.
 * https://github.com/elastic/kibana/issues/74301
 * https://github.com/elastic/kibana/issues/8677
 * https://github.com/elastic/elasticsearch/issues/20941
 * https://github.com/elastic/elasticsearch/pull/22201
 **/
export declare const getConvertedValueForField: (field: DataViewFieldBase, value: string | boolean | number) => string | number | boolean;
