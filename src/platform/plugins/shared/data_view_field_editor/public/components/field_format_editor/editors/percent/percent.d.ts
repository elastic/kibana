import { NumberFormatEditor } from '../number/number';
export declare class PercentFormatEditor extends NumberFormatEditor {
    static formatId: string;
    state: {
        sampleInputs: number[];
        sampleConverterType: import("../../../../../../field_formats/common").FieldFormatsContentType;
        error: undefined;
        samples: import("../..").Sample[];
        sampleInputsByType: {};
    };
}
