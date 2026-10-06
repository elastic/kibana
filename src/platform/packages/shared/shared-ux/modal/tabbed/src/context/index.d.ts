/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import { type PropsWithChildren, type Dispatch } from 'react';
interface IDispatchAction {
  type: string;
  payload: any;
}
export type IDispatchFunction = Dispatch<IDispatchAction>;
export interface IMetaState {
  defaultSelectedTabId: string;
  selectedTabId: string;
}
type IReducer<S> = (state: S, action: IDispatchAction) => S;
export interface ITabDeclaration<S = {}> {
  id: string;
  name: string;
  initialState?: Partial<S>;
  reducer?: IReducer<S>;
}
interface IModalContext<T extends Array<ITabDeclaration<Record<string, any>>>> {
  tabs: Array<Omit<T[number], 'reducer' | 'initialState'>>;
  state: {
    meta: IMetaState;
    [index: string]: any;
  };
  dispatch: Dispatch<IDispatchAction>;
}
export declare const useModalContext: <
  T extends Array<ITabDeclaration<Record<string, any>>>
>() => IModalContext<T>;
export type IModalContextProviderProps<Tabs extends Array<ITabDeclaration<Record<string, any>>>> =
  PropsWithChildren<{
    /**
     * Array of tab declaration to be rendered into the modal that will be rendered
     */
    tabs: Tabs;
    /**
     * ID of the tab we'd like the modal to have selected on render
     */
    defaultSelectedTabId: Tabs[number]['id'];
  }>;
export declare function ModalContextProvider<
  T extends Array<ITabDeclaration<Record<string, any>>>
>({ tabs, defaultSelectedTabId, children }: IModalContextProviderProps<T>): React.JSX.Element;
export {};
