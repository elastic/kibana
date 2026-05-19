export interface Content<T = any> {
    isValid: boolean | undefined;
    validate(): Promise<boolean>;
    getData(): T;
}
interface Validation<T extends object> {
    isValid: boolean | undefined;
    contents: {
        [K in keyof T]: boolean | undefined;
    };
}
export interface HookProps<T extends object> {
    defaultValue?: T;
    onChange?: (output: Content<T>) => void;
}
export interface MultiContent<T extends object> {
    updateContentAt: (id: keyof T, content: Content) => void;
    saveSnapshotAndRemoveContent: (id: keyof T) => void;
    getData: () => T;
    getSingleContentData: <K extends keyof T>(contentId: K) => T[K];
    validate: () => Promise<boolean>;
    validation: Validation<T>;
}
export declare function useMultiContent<T extends object>({ defaultValue, onChange, }: HookProps<T>): MultiContent<T>;
export {};
