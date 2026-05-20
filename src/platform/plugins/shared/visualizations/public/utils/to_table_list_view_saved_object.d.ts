import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { VisualizationListItem } from '../vis_types/vis_type_alias_registry';
export type VisualizeUserContent = VisualizationListItem & UserContentCommonSchema & {
    type: string;
    attributes: {
        id: string;
        title: string;
        description?: string;
        readOnly: boolean;
        error?: string;
    };
};
export declare const toTableListViewSavedObject: (savedObject: Record<string, unknown>) => VisualizeUserContent;
