/**
 * Type and name tuple to identify provider used to authenticate user.
 */
export interface AuthenticationProvider {
    /**
     * Type of the Kibana authentication provider.
     */
    type: string;
    /**
     * Name of the Kibana authentication provider (arbitrary string).
     */
    name: string;
}
