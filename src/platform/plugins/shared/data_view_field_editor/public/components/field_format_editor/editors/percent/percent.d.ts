import { NumberFormatEditor } from '../number/number';
export declare class PercentFormatEditor extends NumberFormatEditor {
    static formatId: string;
    state: {
        sampleInputs: number[];
        error: undefined;
        samples: import("../..").Sample[];
        sampleInputsByType: {};
    };
}
