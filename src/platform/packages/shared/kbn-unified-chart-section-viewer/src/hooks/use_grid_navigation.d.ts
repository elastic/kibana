interface GridNavigationOptions {
    gridColumns: number;
    gridRows: number;
    totalRows: number;
    gridRef: React.RefObject<HTMLDivElement>;
}
export declare const useGridNavigation: ({ gridColumns, gridRows, totalRows, gridRef, }: GridNavigationOptions) => {
    focusedCell: {
        rowIndex: number;
        colIndex: number;
    };
    handleKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
    handleFocusCell: (rowIndex: number, colIndex: number) => void;
    focusCell: (rowIndex: number, colIndex: number) => void;
    getRowColFromIndex: (index: number) => {
        rowIndex: number;
        colIndex: number;
    };
};
export {};
