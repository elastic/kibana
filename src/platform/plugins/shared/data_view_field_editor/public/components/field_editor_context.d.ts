import type { FunctionComponent, PropsWithChildren } from 'react';
import type { NotificationsStart, CoreStart } from '@kbn/core/public';
import type { BehaviorSubject } from 'rxjs';
import type { DataViewLazy, DataPublicPluginStart, FieldFormatsStart, RuntimeFieldSubFields } from '../shared_imports';
import type { ApiService } from '../lib/api';
import type { InternalFieldType, PluginStart } from '../types';
export interface Context {
    dataView: DataViewLazy;
    fieldTypeToProcess: InternalFieldType;
    uiSettings: CoreStart['uiSettings'];
    links: {
        runtimePainless: string;
    };
    services: {
        search: DataPublicPluginStart['search'];
        api: ApiService;
        notifications: NotificationsStart;
    };
    fieldFormatEditors: PluginStart['fieldFormatEditors'];
    fieldFormats: FieldFormatsStart;
    fieldName$: BehaviorSubject<string>;
    subfields$: BehaviorSubject<RuntimeFieldSubFields | undefined>;
}
export declare const FieldEditorProvider: FunctionComponent<PropsWithChildren<Context>>;
export declare const useFieldEditorContext: () => Context;
export declare const useFieldEditorServices: () => {
    search: DataPublicPluginStart["search"];
    api: ApiService;
    notifications: NotificationsStart;
};
