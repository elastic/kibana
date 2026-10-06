export type AccessControlMode = 'private' | 'public';
export interface AccessControlEntryInput<Role extends string = string> {
    type: 'user';
    id: string;
    role: Role;
}
export interface AccessControlEntry<Role extends string = string> extends AccessControlEntryInput<Role> {
    added_at: string;
}
export interface AccessControl<Role extends string = string> {
    access_mode: AccessControlMode;
    entries: Array<AccessControlEntry<Role>>;
}
export interface AccessControlInput<Role extends string = string> {
    access_mode: AccessControlMode;
    entries?: Array<AccessControlEntryInput<Role>>;
}
