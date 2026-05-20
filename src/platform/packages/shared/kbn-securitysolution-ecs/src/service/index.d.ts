export interface ServiceEcs {
    address?: string[];
    environment?: string[];
    ephemeral_id?: string[];
    id?: string[];
    name?: string[];
    node?: {
        name: string[];
        roles: string[];
        role: string[];
    };
    roles?: string[];
    state?: string[];
    type?: string[];
    version?: string[];
}
