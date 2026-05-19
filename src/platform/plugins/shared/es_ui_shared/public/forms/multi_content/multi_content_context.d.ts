import React from 'react';
import type { HookProps, Content, MultiContent } from './use_multi_content';
interface Props<T extends object> extends HookProps<T> {
    children: JSX.Element | JSX.Element[];
}
export declare function MultiContentProvider<T extends object = {
    [key: string]: any;
}>({ defaultValue, onChange, children, }: Props<T>): React.JSX.Element;
export declare const MultiContentConsumer: React.Consumer<MultiContent<any>>;
export declare function useMultiContentContext<T extends object = {
    [key: string]: any;
}>(): MultiContent<T>;
/**
 * Hook to declare a new content and get its defaultValue and a handler to update its content
 *
 * @param contentId The content id to be added to the "contents" map
 */
export declare function useContent<T extends object, K extends keyof T>(contentId: K): {
    defaultValue: NonNullable<T[K]>;
    updateContent: (content: Content) => void;
    getData: () => T;
    getSingleContentData: <K_1 extends keyof T>(contentId: K_1) => T[K_1];
};
export {};
