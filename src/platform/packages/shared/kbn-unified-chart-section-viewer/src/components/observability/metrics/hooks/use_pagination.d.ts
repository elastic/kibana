export declare const usePagination: <TItem>({ items, pageSize, currentPage, }: {
    items: TItem[];
    pageSize: number;
    currentPage: number;
}) => {
    currentPageItems: TItem[];
    totalPages: number;
    totalCount: number;
};
