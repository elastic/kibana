import type { XAxisConfigFn, YAxisConfigFn } from '../types';
type CommonAxisConfigFn = XAxisConfigFn | YAxisConfigFn;
export declare const commonAxisConfigArgs: Omit<CommonAxisConfigFn['args'], 'scaleType' | 'mode' | 'boundsMargin'>;
export {};
