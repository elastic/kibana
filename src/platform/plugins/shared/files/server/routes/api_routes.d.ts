export * from '../../common/api_routes';
export declare const FILES_API_ROUTES: {
    find: string;
    bulkDelete: string;
    metrics: string;
    public: {
        download: string;
    };
    fileKind: {
        getCreateFileRoute: (fileKind: string) => string;
        getUploadRoute: (fileKind: string) => string;
        getDownloadRoute: (fileKind: string) => string;
        getUpdateRoute: (fileKind: string) => string;
        getDeleteRoute: (fileKind: string) => string;
        getListRoute: (fileKind: string) => string;
        getByIdRoute: (fileKind: string) => string;
        getShareRoute: (fileKind: string) => string;
        getUnshareRoute: (fileKind: string) => string;
        getGetShareRoute: (fileKind: string) => string;
        getListShareRoute: (fileKind: string) => string;
    };
};
