import type { CoreStart } from '@kbn/core/public';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public';
import type { CPSPluginStart } from '@kbn/cps/public';
import type { DataPublicPluginStart } from './shared_imports';
import type { CloseEditor, DataViewEditorProps } from './types';
interface Dependencies {
    core: CoreStart;
    searchClient: DataPublicPluginStart['search']['search'];
    dataViews: DataViewsServicePublic;
    cps?: CPSPluginStart;
}
export declare const getEditorOpener: ({ core, searchClient, dataViews, cps }: Dependencies) => (options: DataViewEditorProps) => CloseEditor;
export {};
