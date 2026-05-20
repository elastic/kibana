import type { SearchQuery } from '@kbn/content-management-plugin/common';
import type { VisualizationCreateIn, VisualizationUpdateIn, VisualizationSearchQuery } from '../../common/content_management';
export declare const visualizationsClient: {
    get: (id: string) => Promise<{
        item: import("../../common/content_management").VisualizationSavedObject;
        meta: {
            outcome: "exactMatch" | "aliasMatch" | "conflict";
            aliasTargetId?: string;
            aliasPurpose?: "savedObjectConversion" | "savedObjectImport";
        };
    }>;
    create: ({ data, options }: Omit<VisualizationCreateIn, "contentTypeId">) => Promise<{
        item: import("../../common/content_management").VisualizationSavedObject;
        meta?: never;
    }>;
    update: ({ id, data, options }: Omit<VisualizationUpdateIn, "contentTypeId">) => Promise<{
        item: import("../../common/content_management").PartialVisualizationSavedObject;
        meta?: never;
    }>;
    delete: (id: string) => Promise<import("@kbn/content-management-plugin/common").DeleteResult>;
    search: (query?: SearchQuery, options?: VisualizationSearchQuery) => Promise<{
        hits: import("../../common/content_management").VisualizationSavedObject[];
        pagination: {
            total: number;
            cursor?: string;
        };
    }>;
};
