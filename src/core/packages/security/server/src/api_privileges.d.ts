export declare enum ApiOperation {
    Read = "read",
    Create = "create",
    Update = "update",
    Delete = "delete",
    Manage = "manage"
}
export declare class ApiPrivileges {
    static manage(subject: string): string;
    static read(subject: string): string;
    static create(subject: string): string;
    static update(subject: string): string;
    static delete(subject: string): string;
}
