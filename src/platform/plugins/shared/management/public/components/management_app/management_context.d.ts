import React from 'react';
import type { AppDependencies } from '../../types';
export declare const AppContext: React.Context<AppDependencies | undefined>;
export declare const AppContextProvider: ({ children, value, }: {
    children: React.ReactNode;
    value: AppDependencies;
}) => React.JSX.Element;
export declare const useAppContext: () => AppDependencies;
