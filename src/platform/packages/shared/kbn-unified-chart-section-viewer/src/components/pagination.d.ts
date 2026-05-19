import React from 'react';
interface PaginationProps {
    totalPages: number;
    currentPage: number;
    onPageChange: (pageIndex: number) => void;
}
export declare const Pagination: ({ totalPages, currentPage, onPageChange }: PaginationProps) => React.JSX.Element | null;
export {};
