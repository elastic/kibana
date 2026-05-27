export declare const usePager: ({ initialPageSize, initialPageIndex, totalItems, }: {
    totalItems: number;
    initialPageSize: number;
    initialPageIndex?: number;
}) => {
    curPageIndex: number;
    pageSize: number;
    changePageIndex: (pageIndex: number) => void;
    changePageSize: (newPageSize: number) => void;
    totalPages: number;
    startIndex: number;
    hasNextPage: boolean;
};
