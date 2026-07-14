import type { RedirectOptions } from './types';
export interface FormatSearchParamsOptions {
    lzCompress?: boolean;
}
export declare function formatSearchParams(opts: RedirectOptions, { lzCompress }?: FormatSearchParamsOptions): URLSearchParams;
