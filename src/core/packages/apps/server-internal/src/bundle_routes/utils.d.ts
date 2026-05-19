import type { Stats } from 'fs';
export declare const generateFileHash: (fd: number) => Promise<string>;
export declare const getFileCacheKey: (path: string, stat: Stats) => string;
