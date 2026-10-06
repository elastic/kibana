export interface IDiffObject {
    removed: string[];
    added: string[];
    changed: string[];
    keys: string[];
}
export declare function applyDiff(target: Record<string, any>, source: Record<string, any>): IDiffObject;
