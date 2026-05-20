export interface SystemEcs {
    audit?: AuditEcs;
    auth?: AuthEcs;
}
export interface AuditEcs {
    package?: PackageEcs;
}
export interface PackageEcs {
    arch?: string[];
    entity_id?: string[];
    name?: string[];
    size?: number[];
    summary?: string[];
    version?: string[];
}
export interface AuthEcs {
    ssh?: SshEcs;
}
export interface SshEcs {
    method?: string[];
    signature?: string[];
}
