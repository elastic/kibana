export declare const tagsToFindOptions: ({ included, excluded, }?: {
    included?: string[];
    excluded?: string[];
}) => {
    hasReference: import("@kbn/core-saved-objects-api-server").SavedObjectsFindOptionsReference[] | undefined;
    hasNoReference: import("@kbn/core-saved-objects-api-server").SavedObjectsFindOptionsReference[] | undefined;
};
