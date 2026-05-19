import type { OsCgroupMetrics } from './types';
interface Arg {
    cpuPath: string;
    cpuAcctPath: string;
}
export declare function gatherV1CgroupMetrics({ cpuAcctPath, cpuPath, }: Arg): Promise<OsCgroupMetrics>;
export {};
