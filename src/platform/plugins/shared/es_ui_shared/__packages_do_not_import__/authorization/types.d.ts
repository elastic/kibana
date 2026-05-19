export interface MissingPrivileges {
    [key: string]: string[] | undefined;
}
export interface Privileges {
    hasAllPrivileges: boolean;
    missingPrivileges: MissingPrivileges;
}
export interface Error {
    error: string;
    cause?: string[];
    message?: string;
    statusCode?: number;
    attributes?: {
        error?: {
            type?: string;
        };
    };
}
