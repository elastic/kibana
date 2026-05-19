import type { History } from 'history';
import type { ChromeStart, DocLinksStart } from '@kbn/core/public';
import type { Filter, Query } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { VisualizeServices, VisualizeEditorVisInstance } from '../types';
export declare const addHelpMenuToAppChrome: (chrome: ChromeStart, docLinks: DocLinksStart) => void;
export declare const addBadgeToAppChrome: (chrome: ChromeStart) => void;
export declare const getDefaultQuery: ({ data }: VisualizeServices) => {
    query: string;
    language: any;
};
export declare const visStateToEditorState: (visInstance: VisualizeEditorVisInstance, services: VisualizeServices) => {
    uiState: any;
    query: Query;
    filters: Filter[];
    vis: {
        title: string;
        type: string;
        params: import("@kbn/visualizations-common").VisParams;
        aggs: import("../../../../data/public").AggConfigSerialized[];
    };
    linked: boolean;
};
export declare const redirectToSavedObjectPage: (services: VisualizeServices, error: any, savedVisualizationsId?: string) => void;
export declare function getVizEditorOriginatingAppUrl(history: History): string;
export declare function isFallbackDataView(dataView?: DataView): dataView is DataView;
