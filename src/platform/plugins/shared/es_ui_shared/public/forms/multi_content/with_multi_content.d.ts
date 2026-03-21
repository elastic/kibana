import React from 'react';
import type { HookProps } from './use_multi_content';
/**
 * HOC to wrap a component with the MultiContentProvider
 *
 * @param Component The component to wrap with the MultiContentProvider
 */
export declare function WithMultiContent<P extends object = {
    [key: string]: any;
}>(Component: React.FunctionComponent<P & HookProps<any>>): <T extends object = {
    [key: string]: any;
}>(props: P & HookProps<T>) => React.JSX.Element;
