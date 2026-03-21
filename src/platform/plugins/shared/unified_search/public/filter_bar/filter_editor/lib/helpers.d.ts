import type { DataViewField } from '@kbn/data-views-plugin/common';
export declare const strings: {
    getInvalidDateFormatProvidedErrorMessage: () => string;
};
export declare const getFieldValidityAndErrorMessage: (field: DataViewField, value?: string | undefined) => {
    isInvalid: boolean;
    errorMessage?: string;
};
export declare const MIDDLE_TRUNCATION_PROPS: {
    truncation: "middle";
};
export declare const SINGLE_SELECTION_AS_TEXT_PROPS: {
    asPlainText: boolean;
};
