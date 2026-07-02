export declare const getUserAccessControlData: () => Promise<{
    uid: string;
    hasGlobalAccessControlPrivilege: boolean;
} | undefined>;
