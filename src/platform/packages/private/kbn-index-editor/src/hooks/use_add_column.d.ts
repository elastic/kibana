declare const errorCodes: {
    readonly DUPLICATED_FIELD_ERROR: "DUPLICATED_FIELD_ERROR";
};
type ErrorCode = keyof typeof errorCodes;
export declare const errorMessages: Record<ErrorCode, (columnName: string) => string>;
export declare const useAddColumn: (initialColumnName?: string, initialColumnType?: string) => {
    columnType: string | null | undefined;
    setColumnType: import("react").Dispatch<import("react").SetStateAction<string | null | undefined>>;
    columnName: string;
    validationError: "DUPLICATED_FIELD_ERROR" | null;
    setColumnName: import("react").Dispatch<import("react").SetStateAction<string>>;
    saveColumn: () => void;
    resetColumnName: () => void;
};
export {};
