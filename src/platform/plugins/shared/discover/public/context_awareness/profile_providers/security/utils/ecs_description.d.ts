import type { UseFieldsMetadataHook } from '@kbn/fields-metadata-plugin/public/hooks/use_fields_metadata';
/**
 * Helper function to return the description of an allowed value of the specified field
 * @param fieldName
 * @param value
 * @returns ecs description of the value
 */
export declare const getEcsAllowedValueDescription: (fieldsMetadata: ReturnType<UseFieldsMetadataHook>["fieldsMetadata"], value: string) => string;
