export interface Ransomware {
    feature?: string[];
    score?: string[];
    version?: number[];
    child_pids?: string[];
    files?: RansomwareFiles;
}
export interface RansomwareFiles {
    operation?: string[];
    entropy?: number[];
    metrics?: string[];
    extension?: string[];
    original?: OriginalRansomwareFiles;
    path?: string[];
    data?: string[];
    score?: number[];
}
export interface OriginalRansomwareFiles {
    path?: string[];
    extension?: string[];
}
