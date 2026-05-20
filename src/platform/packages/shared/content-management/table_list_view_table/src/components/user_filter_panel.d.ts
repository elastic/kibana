import type { FC } from 'react';
import React from 'react';
interface Context {
    enabled: boolean;
    onSelectedUsersChange: (users: string[]) => void;
    selectedUsers: string[];
    allUsers: string[];
    showNoUserOption: boolean;
    isKibanaVersioningEnabled: boolean;
    entityNamePlural: string;
}
export declare const UserFilterContextProvider: FC<React.PropsWithChildren<Context>>;
export declare const NULL_USER = "no-user";
export declare const UserFilterPanel: FC<{}>;
export {};
