import type { CriticalPath, CriticalPathBase } from './types';
export declare function getCriticalPath<T extends CriticalPathBase>(root: T | undefined, childrenByParentId: Record<string, T[]>): CriticalPath<T>;
