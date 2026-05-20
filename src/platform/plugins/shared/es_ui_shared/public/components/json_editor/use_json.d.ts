export interface JsonEditorState<T = {
    [key: string]: any;
}> {
    data: {
        raw: string;
        format(): T;
    };
    validate(): boolean;
    isValid: boolean | undefined;
}
export type OnJsonEditorUpdateHandler<T = {
    [key: string]: any;
}> = (arg: JsonEditorState<T>) => void;
interface Parameters<T extends object> {
    onUpdate: OnJsonEditorUpdateHandler<T>;
    defaultValue?: T;
    value?: string;
}
export declare const useJson: <T extends object = {
    [key: string]: any;
}>({ defaultValue, onUpdate, value, }: Parameters<T>) => {
    content: string;
    setContent: import("react").Dispatch<import("react").SetStateAction<string>>;
    error: string | null;
    isControlled: boolean;
};
export {};
