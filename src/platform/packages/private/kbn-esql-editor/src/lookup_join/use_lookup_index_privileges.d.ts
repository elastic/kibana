export interface LookupIndexPrivileges {
    canCreateIndex: boolean;
    canEditIndex: boolean;
    canReadIndex: boolean;
}
export declare const useLookupIndexPrivileges: () => {
    getPermissions: (indexNames?: string[]) => Promise<Record<string, LookupIndexPrivileges>>;
};
