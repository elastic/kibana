import type { FieldDescriptor } from '@kbn/data-views-plugin/server';
export interface GetAlertFieldsResponse {
    fields: FieldDescriptor[];
}
