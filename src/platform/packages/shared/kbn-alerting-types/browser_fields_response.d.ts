import type { FieldDescriptor } from '@kbn/data-views-plugin/server';
import type { BrowserFields } from './alert_fields_type';
export interface GetBrowserFieldsResponse {
    browserFields: BrowserFields;
    fields: FieldDescriptor[];
}
