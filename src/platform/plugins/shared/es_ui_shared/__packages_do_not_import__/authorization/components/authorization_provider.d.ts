import type { HttpSetup } from '@kbn/core/public';
import React from 'react';
import type { Privileges, Error as CustomError } from '../types';
export interface Authorization {
    isLoading: boolean;
    apiError: CustomError | null;
    privileges: Privileges;
}
export declare const AuthorizationContext: React.Context<Authorization>;
export declare const useAuthorizationContext: () => Authorization;
interface Props {
    privilegesEndpoint: string;
    children: React.ReactNode;
    httpClient: HttpSetup;
}
export declare const AuthorizationProvider: ({ privilegesEndpoint, httpClient, children }: Props) => React.JSX.Element;
export {};
