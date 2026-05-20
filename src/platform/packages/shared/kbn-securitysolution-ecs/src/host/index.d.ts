export interface HostEcs {
    architecture?: string[];
    id?: string[];
    hostname?: string[];
    ip?: string[];
    mac?: string[];
    name?: string[];
    os?: OsEcs;
    type?: string[];
}
export interface OsEcs {
    platform?: string[];
    name?: string[];
    full?: string[];
    family?: string[];
    version?: string[];
    kernel?: string[];
}
