/**
 * A utility function used to validate a table persist data.
 * If any of the properties is not valid, it is returned with undefined value.
 *
 * @param data The data to be validated
 * @param pageSizeOptions The table page size options that are available
 */
export declare const validatePersistData: (data: any, pageSizeOptions: number[]) => {
    pageSize: any;
    sort: any;
};
