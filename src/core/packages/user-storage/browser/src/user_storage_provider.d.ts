import React, { type ReactNode } from 'react';
import type { IUserStorageClient } from './types';
export interface UserStorageProviderProps {
    userStorage: IUserStorageClient;
    children: ReactNode;
}
/**
 * Provider that exposes a {@link IUserStorageClient} to descendant components
 * via React context. Required for `useUserStorage` and `useUserStorageClient`.
 *
 * @public
 */
export declare const UserStorageProvider: ({ userStorage, children }: UserStorageProviderProps) => React.JSX.Element;
