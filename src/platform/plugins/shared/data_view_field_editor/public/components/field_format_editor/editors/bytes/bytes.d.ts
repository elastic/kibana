import { NumberFormatEditor } from '../number/number';
export declare class BytesFormatEditor extends NumberFormatEditor {
    static formatId: string;
    state: {
        sampleInputs: number[];
        error: undefined;
        samples: import("../..").Sample[];
        sampleInputsByType: {};
    };
}
