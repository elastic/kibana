import type { Dispatch } from 'react';
import React from 'react';
import type * as store from '../stores/request';
export declare function RequestContextProvider({ children }: {
    children: React.ReactNode;
}): React.JSX.Element;
export declare const useRequestReadContext: () => store.Store;
export declare const useRequestActionContext: () => Dispatch<store.Actions>;
