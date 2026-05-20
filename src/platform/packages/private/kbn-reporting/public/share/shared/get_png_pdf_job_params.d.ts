import type { ReportParamsGetter, ReportParamsGetterOptions } from '../../types';
import type { JobParamsProviderOptions } from '../share_context_menu';
interface PngPdfReportBaseParams {
    layout: {
        dimensions: {
            height: number;
            width: number;
        };
        id: 'preserve_layout' | 'print';
    };
    objectType: string;
    locatorParams: any;
}
export declare const getPngReportParams: ReportParamsGetter<ReportParamsGetterOptions, PngPdfReportBaseParams>;
export declare const getPdfReportParams: ReportParamsGetter<ReportParamsGetterOptions & {
    optimizedForPrinting?: boolean;
}, PngPdfReportBaseParams>;
export declare const getJobParams: (opts: JobParamsProviderOptions, type: "pngV2" | "printablePdfV2") => () => {
    objectType: string;
    title: string;
    layout: {
        dimensions: {
            height: number;
            width: number;
        };
        id: "preserve_layout" | "print";
    };
    locatorParams: any;
};
export {};
