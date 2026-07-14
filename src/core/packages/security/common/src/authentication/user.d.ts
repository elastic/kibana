/**
 * A set of fields describing Kibana user.
 */
export interface User {
    username: string;
    email?: string;
    full_name?: string;
    roles: readonly string[];
    enabled: boolean;
    metadata?: {
        _reserved: boolean;
        _deprecated?: boolean;
        _deprecated_reason?: string;
    };
}
