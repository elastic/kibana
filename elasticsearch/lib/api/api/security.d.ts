import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
export default class Security {
    transport: Transport;
    constructor(transport: Transport);
    /**
      * Creates or updates a user profile on behalf of another user.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-activate-user-profile.html | Elasticsearch API documentation}
      */
    activateUserProfile(this: That, params: T.SecurityActivateUserProfileRequest | TB.SecurityActivateUserProfileRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityActivateUserProfileResponse>;
    activateUserProfile(this: That, params: T.SecurityActivateUserProfileRequest | TB.SecurityActivateUserProfileRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityActivateUserProfileResponse, unknown>>;
    activateUserProfile(this: That, params: T.SecurityActivateUserProfileRequest | TB.SecurityActivateUserProfileRequest, options?: TransportRequestOptions): Promise<T.SecurityActivateUserProfileResponse>;
    /**
      * Enables you to submit a request with a basic auth header to authenticate a user and retrieve information about the authenticated user. A successful call returns a JSON structure that shows user information such as their username, the roles that are assigned to the user, any assigned metadata, and information about the realms that authenticated and authorized the user. If the user cannot be authenticated, this API returns a 401 status code.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-authenticate.html | Elasticsearch API documentation}
      */
    authenticate(this: That, params?: T.SecurityAuthenticateRequest | TB.SecurityAuthenticateRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityAuthenticateResponse>;
    authenticate(this: That, params?: T.SecurityAuthenticateRequest | TB.SecurityAuthenticateRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityAuthenticateResponse, unknown>>;
    authenticate(this: That, params?: T.SecurityAuthenticateRequest | TB.SecurityAuthenticateRequest, options?: TransportRequestOptions): Promise<T.SecurityAuthenticateResponse>;
    /**
      * The role management APIs are generally the preferred way to manage roles, rather than using file-based role management. The bulk delete roles API cannot delete roles that are defined in roles files.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-bulk-delete-role.html | Elasticsearch API documentation}
      */
    bulkDeleteRole(this: That, params: T.SecurityBulkDeleteRoleRequest | TB.SecurityBulkDeleteRoleRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityBulkDeleteRoleResponse>;
    bulkDeleteRole(this: That, params: T.SecurityBulkDeleteRoleRequest | TB.SecurityBulkDeleteRoleRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityBulkDeleteRoleResponse, unknown>>;
    bulkDeleteRole(this: That, params: T.SecurityBulkDeleteRoleRequest | TB.SecurityBulkDeleteRoleRequest, options?: TransportRequestOptions): Promise<T.SecurityBulkDeleteRoleResponse>;
    /**
      * The role management APIs are generally the preferred way to manage roles, rather than using file-based role management. The bulk create or update roles API cannot update roles that are defined in roles files.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-bulk-put-role.html | Elasticsearch API documentation}
      */
    bulkPutRole(this: That, params: T.SecurityBulkPutRoleRequest | TB.SecurityBulkPutRoleRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityBulkPutRoleResponse>;
    bulkPutRole(this: That, params: T.SecurityBulkPutRoleRequest | TB.SecurityBulkPutRoleRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityBulkPutRoleResponse, unknown>>;
    bulkPutRole(this: That, params: T.SecurityBulkPutRoleRequest | TB.SecurityBulkPutRoleRequest, options?: TransportRequestOptions): Promise<T.SecurityBulkPutRoleResponse>;
    /**
      * Updates the attributes of multiple existing API keys.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-bulk-update-api-keys.html | Elasticsearch API documentation}
      */
    bulkUpdateApiKeys(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    bulkUpdateApiKeys(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    bulkUpdateApiKeys(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
    /**
      * Changes the passwords of users in the native realm and built-in users.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-change-password.html | Elasticsearch API documentation}
      */
    changePassword(this: That, params?: T.SecurityChangePasswordRequest | TB.SecurityChangePasswordRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityChangePasswordResponse>;
    changePassword(this: That, params?: T.SecurityChangePasswordRequest | TB.SecurityChangePasswordRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityChangePasswordResponse, unknown>>;
    changePassword(this: That, params?: T.SecurityChangePasswordRequest | TB.SecurityChangePasswordRequest, options?: TransportRequestOptions): Promise<T.SecurityChangePasswordResponse>;
    /**
      * Evicts a subset of all entries from the API key cache. The cache is also automatically cleared on state changes of the security index.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-clear-api-key-cache.html | Elasticsearch API documentation}
      */
    clearApiKeyCache(this: That, params: T.SecurityClearApiKeyCacheRequest | TB.SecurityClearApiKeyCacheRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityClearApiKeyCacheResponse>;
    clearApiKeyCache(this: That, params: T.SecurityClearApiKeyCacheRequest | TB.SecurityClearApiKeyCacheRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityClearApiKeyCacheResponse, unknown>>;
    clearApiKeyCache(this: That, params: T.SecurityClearApiKeyCacheRequest | TB.SecurityClearApiKeyCacheRequest, options?: TransportRequestOptions): Promise<T.SecurityClearApiKeyCacheResponse>;
    /**
      * Evicts application privileges from the native application privileges cache.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-clear-privilege-cache.html | Elasticsearch API documentation}
      */
    clearCachedPrivileges(this: That, params: T.SecurityClearCachedPrivilegesRequest | TB.SecurityClearCachedPrivilegesRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityClearCachedPrivilegesResponse>;
    clearCachedPrivileges(this: That, params: T.SecurityClearCachedPrivilegesRequest | TB.SecurityClearCachedPrivilegesRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityClearCachedPrivilegesResponse, unknown>>;
    clearCachedPrivileges(this: That, params: T.SecurityClearCachedPrivilegesRequest | TB.SecurityClearCachedPrivilegesRequest, options?: TransportRequestOptions): Promise<T.SecurityClearCachedPrivilegesResponse>;
    /**
      * Evicts users from the user cache. Can completely clear the cache or evict specific users.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-clear-cache.html | Elasticsearch API documentation}
      */
    clearCachedRealms(this: That, params: T.SecurityClearCachedRealmsRequest | TB.SecurityClearCachedRealmsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityClearCachedRealmsResponse>;
    clearCachedRealms(this: That, params: T.SecurityClearCachedRealmsRequest | TB.SecurityClearCachedRealmsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityClearCachedRealmsResponse, unknown>>;
    clearCachedRealms(this: That, params: T.SecurityClearCachedRealmsRequest | TB.SecurityClearCachedRealmsRequest, options?: TransportRequestOptions): Promise<T.SecurityClearCachedRealmsResponse>;
    /**
      * Evicts roles from the native role cache.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-clear-role-cache.html | Elasticsearch API documentation}
      */
    clearCachedRoles(this: That, params: T.SecurityClearCachedRolesRequest | TB.SecurityClearCachedRolesRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityClearCachedRolesResponse>;
    clearCachedRoles(this: That, params: T.SecurityClearCachedRolesRequest | TB.SecurityClearCachedRolesRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityClearCachedRolesResponse, unknown>>;
    clearCachedRoles(this: That, params: T.SecurityClearCachedRolesRequest | TB.SecurityClearCachedRolesRequest, options?: TransportRequestOptions): Promise<T.SecurityClearCachedRolesResponse>;
    /**
      * Evicts tokens from the service account token caches.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-clear-service-token-caches.html | Elasticsearch API documentation}
      */
    clearCachedServiceTokens(this: That, params: T.SecurityClearCachedServiceTokensRequest | TB.SecurityClearCachedServiceTokensRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityClearCachedServiceTokensResponse>;
    clearCachedServiceTokens(this: That, params: T.SecurityClearCachedServiceTokensRequest | TB.SecurityClearCachedServiceTokensRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityClearCachedServiceTokensResponse, unknown>>;
    clearCachedServiceTokens(this: That, params: T.SecurityClearCachedServiceTokensRequest | TB.SecurityClearCachedServiceTokensRequest, options?: TransportRequestOptions): Promise<T.SecurityClearCachedServiceTokensResponse>;
    /**
      * Creates an API key for access without requiring basic authentication. A successful request returns a JSON structure that contains the API key, its unique id, and its name. If applicable, it also returns expiration information for the API key in milliseconds. NOTE: By default, API keys never expire. You can specify expiration information when you create the API keys.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-create-api-key.html | Elasticsearch API documentation}
      */
    createApiKey(this: That, params?: T.SecurityCreateApiKeyRequest | TB.SecurityCreateApiKeyRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityCreateApiKeyResponse>;
    createApiKey(this: That, params?: T.SecurityCreateApiKeyRequest | TB.SecurityCreateApiKeyRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityCreateApiKeyResponse, unknown>>;
    createApiKey(this: That, params?: T.SecurityCreateApiKeyRequest | TB.SecurityCreateApiKeyRequest, options?: TransportRequestOptions): Promise<T.SecurityCreateApiKeyResponse>;
    /**
      * Creates a cross-cluster API key for API key based remote cluster access.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-create-cross-cluster-api-key.html | Elasticsearch API documentation}
      */
    createCrossClusterApiKey(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    createCrossClusterApiKey(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    createCrossClusterApiKey(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
    /**
      * Creates a service accounts token for access without requiring basic authentication.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-create-service-token.html | Elasticsearch API documentation}
      */
    createServiceToken(this: That, params: T.SecurityCreateServiceTokenRequest | TB.SecurityCreateServiceTokenRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityCreateServiceTokenResponse>;
    createServiceToken(this: That, params: T.SecurityCreateServiceTokenRequest | TB.SecurityCreateServiceTokenRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityCreateServiceTokenResponse, unknown>>;
    createServiceToken(this: That, params: T.SecurityCreateServiceTokenRequest | TB.SecurityCreateServiceTokenRequest, options?: TransportRequestOptions): Promise<T.SecurityCreateServiceTokenResponse>;
    /**
      * Removes application privileges.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-delete-privilege.html | Elasticsearch API documentation}
      */
    deletePrivileges(this: That, params: T.SecurityDeletePrivilegesRequest | TB.SecurityDeletePrivilegesRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityDeletePrivilegesResponse>;
    deletePrivileges(this: That, params: T.SecurityDeletePrivilegesRequest | TB.SecurityDeletePrivilegesRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityDeletePrivilegesResponse, unknown>>;
    deletePrivileges(this: That, params: T.SecurityDeletePrivilegesRequest | TB.SecurityDeletePrivilegesRequest, options?: TransportRequestOptions): Promise<T.SecurityDeletePrivilegesResponse>;
    /**
      * Removes roles in the native realm.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-delete-role.html | Elasticsearch API documentation}
      */
    deleteRole(this: That, params: T.SecurityDeleteRoleRequest | TB.SecurityDeleteRoleRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityDeleteRoleResponse>;
    deleteRole(this: That, params: T.SecurityDeleteRoleRequest | TB.SecurityDeleteRoleRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityDeleteRoleResponse, unknown>>;
    deleteRole(this: That, params: T.SecurityDeleteRoleRequest | TB.SecurityDeleteRoleRequest, options?: TransportRequestOptions): Promise<T.SecurityDeleteRoleResponse>;
    /**
      * Removes role mappings.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-delete-role-mapping.html | Elasticsearch API documentation}
      */
    deleteRoleMapping(this: That, params: T.SecurityDeleteRoleMappingRequest | TB.SecurityDeleteRoleMappingRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityDeleteRoleMappingResponse>;
    deleteRoleMapping(this: That, params: T.SecurityDeleteRoleMappingRequest | TB.SecurityDeleteRoleMappingRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityDeleteRoleMappingResponse, unknown>>;
    deleteRoleMapping(this: That, params: T.SecurityDeleteRoleMappingRequest | TB.SecurityDeleteRoleMappingRequest, options?: TransportRequestOptions): Promise<T.SecurityDeleteRoleMappingResponse>;
    /**
      * Deletes a service account token.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-delete-service-token.html | Elasticsearch API documentation}
      */
    deleteServiceToken(this: That, params: T.SecurityDeleteServiceTokenRequest | TB.SecurityDeleteServiceTokenRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityDeleteServiceTokenResponse>;
    deleteServiceToken(this: That, params: T.SecurityDeleteServiceTokenRequest | TB.SecurityDeleteServiceTokenRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityDeleteServiceTokenResponse, unknown>>;
    deleteServiceToken(this: That, params: T.SecurityDeleteServiceTokenRequest | TB.SecurityDeleteServiceTokenRequest, options?: TransportRequestOptions): Promise<T.SecurityDeleteServiceTokenResponse>;
    /**
      * Deletes users from the native realm.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-delete-user.html | Elasticsearch API documentation}
      */
    deleteUser(this: That, params: T.SecurityDeleteUserRequest | TB.SecurityDeleteUserRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityDeleteUserResponse>;
    deleteUser(this: That, params: T.SecurityDeleteUserRequest | TB.SecurityDeleteUserRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityDeleteUserResponse, unknown>>;
    deleteUser(this: That, params: T.SecurityDeleteUserRequest | TB.SecurityDeleteUserRequest, options?: TransportRequestOptions): Promise<T.SecurityDeleteUserResponse>;
    /**
      * Disables users in the native realm.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-disable-user.html | Elasticsearch API documentation}
      */
    disableUser(this: That, params: T.SecurityDisableUserRequest | TB.SecurityDisableUserRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityDisableUserResponse>;
    disableUser(this: That, params: T.SecurityDisableUserRequest | TB.SecurityDisableUserRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityDisableUserResponse, unknown>>;
    disableUser(this: That, params: T.SecurityDisableUserRequest | TB.SecurityDisableUserRequest, options?: TransportRequestOptions): Promise<T.SecurityDisableUserResponse>;
    /**
      * Disables a user profile so it's not visible in user profile searches.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-disable-user-profile.html | Elasticsearch API documentation}
      */
    disableUserProfile(this: That, params: T.SecurityDisableUserProfileRequest | TB.SecurityDisableUserProfileRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityDisableUserProfileResponse>;
    disableUserProfile(this: That, params: T.SecurityDisableUserProfileRequest | TB.SecurityDisableUserProfileRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityDisableUserProfileResponse, unknown>>;
    disableUserProfile(this: That, params: T.SecurityDisableUserProfileRequest | TB.SecurityDisableUserProfileRequest, options?: TransportRequestOptions): Promise<T.SecurityDisableUserProfileResponse>;
    /**
      * Enables users in the native realm.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-enable-user.html | Elasticsearch API documentation}
      */
    enableUser(this: That, params: T.SecurityEnableUserRequest | TB.SecurityEnableUserRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityEnableUserResponse>;
    enableUser(this: That, params: T.SecurityEnableUserRequest | TB.SecurityEnableUserRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityEnableUserResponse, unknown>>;
    enableUser(this: That, params: T.SecurityEnableUserRequest | TB.SecurityEnableUserRequest, options?: TransportRequestOptions): Promise<T.SecurityEnableUserResponse>;
    /**
      * Enables a user profile so it's visible in user profile searches.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-enable-user-profile.html | Elasticsearch API documentation}
      */
    enableUserProfile(this: That, params: T.SecurityEnableUserProfileRequest | TB.SecurityEnableUserProfileRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityEnableUserProfileResponse>;
    enableUserProfile(this: That, params: T.SecurityEnableUserProfileRequest | TB.SecurityEnableUserProfileRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityEnableUserProfileResponse, unknown>>;
    enableUserProfile(this: That, params: T.SecurityEnableUserProfileRequest | TB.SecurityEnableUserProfileRequest, options?: TransportRequestOptions): Promise<T.SecurityEnableUserProfileResponse>;
    /**
      * Enables a Kibana instance to configure itself for communication with a secured Elasticsearch cluster.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-kibana-enrollment.html | Elasticsearch API documentation}
      */
    enrollKibana(this: That, params?: T.SecurityEnrollKibanaRequest | TB.SecurityEnrollKibanaRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityEnrollKibanaResponse>;
    enrollKibana(this: That, params?: T.SecurityEnrollKibanaRequest | TB.SecurityEnrollKibanaRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityEnrollKibanaResponse, unknown>>;
    enrollKibana(this: That, params?: T.SecurityEnrollKibanaRequest | TB.SecurityEnrollKibanaRequest, options?: TransportRequestOptions): Promise<T.SecurityEnrollKibanaResponse>;
    /**
      * Allows a new node to join an existing cluster with security features enabled.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-node-enrollment.html | Elasticsearch API documentation}
      */
    enrollNode(this: That, params?: T.SecurityEnrollNodeRequest | TB.SecurityEnrollNodeRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityEnrollNodeResponse>;
    enrollNode(this: That, params?: T.SecurityEnrollNodeRequest | TB.SecurityEnrollNodeRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityEnrollNodeResponse, unknown>>;
    enrollNode(this: That, params?: T.SecurityEnrollNodeRequest | TB.SecurityEnrollNodeRequest, options?: TransportRequestOptions): Promise<T.SecurityEnrollNodeResponse>;
    /**
      * Retrieves information for one or more API keys. NOTE: If you have only the `manage_own_api_key` privilege, this API returns only the API keys that you own. If you have `read_security`, `manage_api_key` or greater privileges (including `manage_security`), this API returns all API keys regardless of ownership.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-get-api-key.html | Elasticsearch API documentation}
      */
    getApiKey(this: That, params?: T.SecurityGetApiKeyRequest | TB.SecurityGetApiKeyRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityGetApiKeyResponse>;
    getApiKey(this: That, params?: T.SecurityGetApiKeyRequest | TB.SecurityGetApiKeyRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityGetApiKeyResponse, unknown>>;
    getApiKey(this: That, params?: T.SecurityGetApiKeyRequest | TB.SecurityGetApiKeyRequest, options?: TransportRequestOptions): Promise<T.SecurityGetApiKeyResponse>;
    /**
      * Retrieves the list of cluster privileges and index privileges that are available in this version of Elasticsearch.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-get-builtin-privileges.html | Elasticsearch API documentation}
      */
    getBuiltinPrivileges(this: That, params?: T.SecurityGetBuiltinPrivilegesRequest | TB.SecurityGetBuiltinPrivilegesRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityGetBuiltinPrivilegesResponse>;
    getBuiltinPrivileges(this: That, params?: T.SecurityGetBuiltinPrivilegesRequest | TB.SecurityGetBuiltinPrivilegesRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityGetBuiltinPrivilegesResponse, unknown>>;
    getBuiltinPrivileges(this: That, params?: T.SecurityGetBuiltinPrivilegesRequest | TB.SecurityGetBuiltinPrivilegesRequest, options?: TransportRequestOptions): Promise<T.SecurityGetBuiltinPrivilegesResponse>;
    /**
      * Retrieves application privileges.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-get-privileges.html | Elasticsearch API documentation}
      */
    getPrivileges(this: That, params?: T.SecurityGetPrivilegesRequest | TB.SecurityGetPrivilegesRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityGetPrivilegesResponse>;
    getPrivileges(this: That, params?: T.SecurityGetPrivilegesRequest | TB.SecurityGetPrivilegesRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityGetPrivilegesResponse, unknown>>;
    getPrivileges(this: That, params?: T.SecurityGetPrivilegesRequest | TB.SecurityGetPrivilegesRequest, options?: TransportRequestOptions): Promise<T.SecurityGetPrivilegesResponse>;
    /**
      * The role management APIs are generally the preferred way to manage roles, rather than using file-based role management. The get roles API cannot retrieve roles that are defined in roles files.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-get-role.html | Elasticsearch API documentation}
      */
    getRole(this: That, params?: T.SecurityGetRoleRequest | TB.SecurityGetRoleRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityGetRoleResponse>;
    getRole(this: That, params?: T.SecurityGetRoleRequest | TB.SecurityGetRoleRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityGetRoleResponse, unknown>>;
    getRole(this: That, params?: T.SecurityGetRoleRequest | TB.SecurityGetRoleRequest, options?: TransportRequestOptions): Promise<T.SecurityGetRoleResponse>;
    /**
      * Retrieves role mappings.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-get-role-mapping.html | Elasticsearch API documentation}
      */
    getRoleMapping(this: That, params?: T.SecurityGetRoleMappingRequest | TB.SecurityGetRoleMappingRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityGetRoleMappingResponse>;
    getRoleMapping(this: That, params?: T.SecurityGetRoleMappingRequest | TB.SecurityGetRoleMappingRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityGetRoleMappingResponse, unknown>>;
    getRoleMapping(this: That, params?: T.SecurityGetRoleMappingRequest | TB.SecurityGetRoleMappingRequest, options?: TransportRequestOptions): Promise<T.SecurityGetRoleMappingResponse>;
    /**
      * This API returns a list of service accounts that match the provided path parameter(s).
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-get-service-accounts.html | Elasticsearch API documentation}
      */
    getServiceAccounts(this: That, params?: T.SecurityGetServiceAccountsRequest | TB.SecurityGetServiceAccountsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityGetServiceAccountsResponse>;
    getServiceAccounts(this: That, params?: T.SecurityGetServiceAccountsRequest | TB.SecurityGetServiceAccountsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityGetServiceAccountsResponse, unknown>>;
    getServiceAccounts(this: That, params?: T.SecurityGetServiceAccountsRequest | TB.SecurityGetServiceAccountsRequest, options?: TransportRequestOptions): Promise<T.SecurityGetServiceAccountsResponse>;
    /**
      * Retrieves information of all service credentials for a service account.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-get-service-credentials.html | Elasticsearch API documentation}
      */
    getServiceCredentials(this: That, params: T.SecurityGetServiceCredentialsRequest | TB.SecurityGetServiceCredentialsRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityGetServiceCredentialsResponse>;
    getServiceCredentials(this: That, params: T.SecurityGetServiceCredentialsRequest | TB.SecurityGetServiceCredentialsRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityGetServiceCredentialsResponse, unknown>>;
    getServiceCredentials(this: That, params: T.SecurityGetServiceCredentialsRequest | TB.SecurityGetServiceCredentialsRequest, options?: TransportRequestOptions): Promise<T.SecurityGetServiceCredentialsResponse>;
    /**
      * Retrieve settings for the security system indices
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-get-settings.html | Elasticsearch API documentation}
      */
    getSettings(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    getSettings(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    getSettings(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
    /**
      * Creates a bearer token for access without requiring basic authentication.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-get-token.html | Elasticsearch API documentation}
      */
    getToken(this: That, params?: T.SecurityGetTokenRequest | TB.SecurityGetTokenRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityGetTokenResponse>;
    getToken(this: That, params?: T.SecurityGetTokenRequest | TB.SecurityGetTokenRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityGetTokenResponse, unknown>>;
    getToken(this: That, params?: T.SecurityGetTokenRequest | TB.SecurityGetTokenRequest, options?: TransportRequestOptions): Promise<T.SecurityGetTokenResponse>;
    /**
      * Retrieves information about users in the native realm and built-in users.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-get-user.html | Elasticsearch API documentation}
      */
    getUser(this: That, params?: T.SecurityGetUserRequest | TB.SecurityGetUserRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityGetUserResponse>;
    getUser(this: That, params?: T.SecurityGetUserRequest | TB.SecurityGetUserRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityGetUserResponse, unknown>>;
    getUser(this: That, params?: T.SecurityGetUserRequest | TB.SecurityGetUserRequest, options?: TransportRequestOptions): Promise<T.SecurityGetUserResponse>;
    /**
      * Retrieves security privileges for the logged in user.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-get-user-privileges.html | Elasticsearch API documentation}
      */
    getUserPrivileges(this: That, params?: T.SecurityGetUserPrivilegesRequest | TB.SecurityGetUserPrivilegesRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityGetUserPrivilegesResponse>;
    getUserPrivileges(this: That, params?: T.SecurityGetUserPrivilegesRequest | TB.SecurityGetUserPrivilegesRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityGetUserPrivilegesResponse, unknown>>;
    getUserPrivileges(this: That, params?: T.SecurityGetUserPrivilegesRequest | TB.SecurityGetUserPrivilegesRequest, options?: TransportRequestOptions): Promise<T.SecurityGetUserPrivilegesResponse>;
    /**
      * Retrieves a user's profile using the unique profile ID.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-get-user-profile.html | Elasticsearch API documentation}
      */
    getUserProfile(this: That, params: T.SecurityGetUserProfileRequest | TB.SecurityGetUserProfileRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityGetUserProfileResponse>;
    getUserProfile(this: That, params: T.SecurityGetUserProfileRequest | TB.SecurityGetUserProfileRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityGetUserProfileResponse, unknown>>;
    getUserProfile(this: That, params: T.SecurityGetUserProfileRequest | TB.SecurityGetUserProfileRequest, options?: TransportRequestOptions): Promise<T.SecurityGetUserProfileResponse>;
    /**
      * Creates an API key on behalf of another user. This API is similar to Create API keys, however it creates the API key for a user that is different than the user that runs the API. The caller must have authentication credentials (either an access token, or a username and password) for the user on whose behalf the API key will be created. It is not possible to use this API to create an API key without that user’s credentials. The user, for whom the authentication credentials is provided, can optionally "run as" (impersonate) another user. In this case, the API key will be created on behalf of the impersonated user. This API is intended be used by applications that need to create and manage API keys for end users, but cannot guarantee that those users have permission to create API keys on their own behalf. A successful grant API key API call returns a JSON structure that contains the API key, its unique id, and its name. If applicable, it also returns expiration information for the API key in milliseconds. By default, API keys never expire. You can specify expiration information when you create the API keys.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-grant-api-key.html | Elasticsearch API documentation}
      */
    grantApiKey(this: That, params: T.SecurityGrantApiKeyRequest | TB.SecurityGrantApiKeyRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityGrantApiKeyResponse>;
    grantApiKey(this: That, params: T.SecurityGrantApiKeyRequest | TB.SecurityGrantApiKeyRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityGrantApiKeyResponse, unknown>>;
    grantApiKey(this: That, params: T.SecurityGrantApiKeyRequest | TB.SecurityGrantApiKeyRequest, options?: TransportRequestOptions): Promise<T.SecurityGrantApiKeyResponse>;
    /**
      * Determines whether the specified user has a specified list of privileges.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-has-privileges.html | Elasticsearch API documentation}
      */
    hasPrivileges(this: That, params?: T.SecurityHasPrivilegesRequest | TB.SecurityHasPrivilegesRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityHasPrivilegesResponse>;
    hasPrivileges(this: That, params?: T.SecurityHasPrivilegesRequest | TB.SecurityHasPrivilegesRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityHasPrivilegesResponse, unknown>>;
    hasPrivileges(this: That, params?: T.SecurityHasPrivilegesRequest | TB.SecurityHasPrivilegesRequest, options?: TransportRequestOptions): Promise<T.SecurityHasPrivilegesResponse>;
    /**
      * Determines whether the users associated with the specified profile IDs have all the requested privileges.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-has-privileges-user-profile.html | Elasticsearch API documentation}
      */
    hasPrivilegesUserProfile(this: That, params: T.SecurityHasPrivilegesUserProfileRequest | TB.SecurityHasPrivilegesUserProfileRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityHasPrivilegesUserProfileResponse>;
    hasPrivilegesUserProfile(this: That, params: T.SecurityHasPrivilegesUserProfileRequest | TB.SecurityHasPrivilegesUserProfileRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityHasPrivilegesUserProfileResponse, unknown>>;
    hasPrivilegesUserProfile(this: That, params: T.SecurityHasPrivilegesUserProfileRequest | TB.SecurityHasPrivilegesUserProfileRequest, options?: TransportRequestOptions): Promise<T.SecurityHasPrivilegesUserProfileResponse>;
    /**
      * Invalidates one or more API keys. The `manage_api_key` privilege allows deleting any API keys. The `manage_own_api_key` only allows deleting API keys that are owned by the user. In addition, with the `manage_own_api_key` privilege, an invalidation request must be issued in one of the three formats: - Set the parameter `owner=true`. - Or, set both `username` and `realm_name` to match the user’s identity. - Or, if the request is issued by an API key, i.e. an API key invalidates itself, specify its ID in the `ids` field.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-invalidate-api-key.html | Elasticsearch API documentation}
      */
    invalidateApiKey(this: That, params?: T.SecurityInvalidateApiKeyRequest | TB.SecurityInvalidateApiKeyRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityInvalidateApiKeyResponse>;
    invalidateApiKey(this: That, params?: T.SecurityInvalidateApiKeyRequest | TB.SecurityInvalidateApiKeyRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityInvalidateApiKeyResponse, unknown>>;
    invalidateApiKey(this: That, params?: T.SecurityInvalidateApiKeyRequest | TB.SecurityInvalidateApiKeyRequest, options?: TransportRequestOptions): Promise<T.SecurityInvalidateApiKeyResponse>;
    /**
      * Invalidates one or more access tokens or refresh tokens.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-invalidate-token.html | Elasticsearch API documentation}
      */
    invalidateToken(this: That, params?: T.SecurityInvalidateTokenRequest | TB.SecurityInvalidateTokenRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityInvalidateTokenResponse>;
    invalidateToken(this: That, params?: T.SecurityInvalidateTokenRequest | TB.SecurityInvalidateTokenRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityInvalidateTokenResponse, unknown>>;
    invalidateToken(this: That, params?: T.SecurityInvalidateTokenRequest | TB.SecurityInvalidateTokenRequest, options?: TransportRequestOptions): Promise<T.SecurityInvalidateTokenResponse>;
    /**
      * Exchanges an OpenID Connection authentication response message for an Elasticsearch access token and refresh token pair
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-oidc-authenticate.html | Elasticsearch API documentation}
      */
    oidcAuthenticate(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    oidcAuthenticate(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    oidcAuthenticate(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
    /**
      * Invalidates a refresh token and access token that was generated from the OpenID Connect Authenticate API
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-oidc-logout.html | Elasticsearch API documentation}
      */
    oidcLogout(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    oidcLogout(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    oidcLogout(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
    /**
      * Creates an OAuth 2.0 authentication request as a URL string
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-oidc-prepare-authentication.html | Elasticsearch API documentation}
      */
    oidcPrepareAuthentication(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    oidcPrepareAuthentication(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    oidcPrepareAuthentication(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
    /**
      * Adds or updates application privileges.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-put-privileges.html | Elasticsearch API documentation}
      */
    putPrivileges(this: That, params: T.SecurityPutPrivilegesRequest | TB.SecurityPutPrivilegesRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityPutPrivilegesResponse>;
    putPrivileges(this: That, params: T.SecurityPutPrivilegesRequest | TB.SecurityPutPrivilegesRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityPutPrivilegesResponse, unknown>>;
    putPrivileges(this: That, params: T.SecurityPutPrivilegesRequest | TB.SecurityPutPrivilegesRequest, options?: TransportRequestOptions): Promise<T.SecurityPutPrivilegesResponse>;
    /**
      * The role management APIs are generally the preferred way to manage roles, rather than using file-based role management. The create or update roles API cannot update roles that are defined in roles files.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-put-role.html | Elasticsearch API documentation}
      */
    putRole(this: That, params: T.SecurityPutRoleRequest | TB.SecurityPutRoleRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityPutRoleResponse>;
    putRole(this: That, params: T.SecurityPutRoleRequest | TB.SecurityPutRoleRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityPutRoleResponse, unknown>>;
    putRole(this: That, params: T.SecurityPutRoleRequest | TB.SecurityPutRoleRequest, options?: TransportRequestOptions): Promise<T.SecurityPutRoleResponse>;
    /**
      * Creates and updates role mappings.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-put-role-mapping.html | Elasticsearch API documentation}
      */
    putRoleMapping(this: That, params: T.SecurityPutRoleMappingRequest | TB.SecurityPutRoleMappingRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityPutRoleMappingResponse>;
    putRoleMapping(this: That, params: T.SecurityPutRoleMappingRequest | TB.SecurityPutRoleMappingRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityPutRoleMappingResponse, unknown>>;
    putRoleMapping(this: That, params: T.SecurityPutRoleMappingRequest | TB.SecurityPutRoleMappingRequest, options?: TransportRequestOptions): Promise<T.SecurityPutRoleMappingResponse>;
    /**
      * Adds and updates users in the native realm. These users are commonly referred to as native users.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-put-user.html | Elasticsearch API documentation}
      */
    putUser(this: That, params: T.SecurityPutUserRequest | TB.SecurityPutUserRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityPutUserResponse>;
    putUser(this: That, params: T.SecurityPutUserRequest | TB.SecurityPutUserRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityPutUserResponse, unknown>>;
    putUser(this: That, params: T.SecurityPutUserRequest | TB.SecurityPutUserRequest, options?: TransportRequestOptions): Promise<T.SecurityPutUserResponse>;
    /**
      * Retrieves information for API keys in a paginated manner. You can optionally filter the results with a query.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-query-api-key.html | Elasticsearch API documentation}
      */
    queryApiKeys(this: That, params?: T.SecurityQueryApiKeysRequest | TB.SecurityQueryApiKeysRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityQueryApiKeysResponse>;
    queryApiKeys(this: That, params?: T.SecurityQueryApiKeysRequest | TB.SecurityQueryApiKeysRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityQueryApiKeysResponse, unknown>>;
    queryApiKeys(this: That, params?: T.SecurityQueryApiKeysRequest | TB.SecurityQueryApiKeysRequest, options?: TransportRequestOptions): Promise<T.SecurityQueryApiKeysResponse>;
    /**
      * Retrieves roles in a paginated manner. You can optionally filter the results with a query.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-query-role.html | Elasticsearch API documentation}
      */
    queryRole(this: That, params?: T.SecurityQueryRoleRequest | TB.SecurityQueryRoleRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityQueryRoleResponse>;
    queryRole(this: That, params?: T.SecurityQueryRoleRequest | TB.SecurityQueryRoleRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityQueryRoleResponse, unknown>>;
    queryRole(this: That, params?: T.SecurityQueryRoleRequest | TB.SecurityQueryRoleRequest, options?: TransportRequestOptions): Promise<T.SecurityQueryRoleResponse>;
    /**
      * Retrieves information for Users in a paginated manner. You can optionally filter the results with a query.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-query-user.html | Elasticsearch API documentation}
      */
    queryUser(this: That, params?: T.SecurityQueryUserRequest | TB.SecurityQueryUserRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityQueryUserResponse>;
    queryUser(this: That, params?: T.SecurityQueryUserRequest | TB.SecurityQueryUserRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityQueryUserResponse, unknown>>;
    queryUser(this: That, params?: T.SecurityQueryUserRequest | TB.SecurityQueryUserRequest, options?: TransportRequestOptions): Promise<T.SecurityQueryUserResponse>;
    /**
      * Submits a SAML Response message to Elasticsearch for consumption.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-saml-authenticate.html | Elasticsearch API documentation}
      */
    samlAuthenticate(this: That, params: T.SecuritySamlAuthenticateRequest | TB.SecuritySamlAuthenticateRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecuritySamlAuthenticateResponse>;
    samlAuthenticate(this: That, params: T.SecuritySamlAuthenticateRequest | TB.SecuritySamlAuthenticateRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecuritySamlAuthenticateResponse, unknown>>;
    samlAuthenticate(this: That, params: T.SecuritySamlAuthenticateRequest | TB.SecuritySamlAuthenticateRequest, options?: TransportRequestOptions): Promise<T.SecuritySamlAuthenticateResponse>;
    /**
      * Verifies the logout response sent from the SAML IdP.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-saml-complete-logout.html | Elasticsearch API documentation}
      */
    samlCompleteLogout(this: That, params: T.SecuritySamlCompleteLogoutRequest | TB.SecuritySamlCompleteLogoutRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecuritySamlCompleteLogoutResponse>;
    samlCompleteLogout(this: That, params: T.SecuritySamlCompleteLogoutRequest | TB.SecuritySamlCompleteLogoutRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecuritySamlCompleteLogoutResponse, unknown>>;
    samlCompleteLogout(this: That, params: T.SecuritySamlCompleteLogoutRequest | TB.SecuritySamlCompleteLogoutRequest, options?: TransportRequestOptions): Promise<T.SecuritySamlCompleteLogoutResponse>;
    /**
      * Submits a SAML LogoutRequest message to Elasticsearch for consumption.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-saml-invalidate.html | Elasticsearch API documentation}
      */
    samlInvalidate(this: That, params: T.SecuritySamlInvalidateRequest | TB.SecuritySamlInvalidateRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecuritySamlInvalidateResponse>;
    samlInvalidate(this: That, params: T.SecuritySamlInvalidateRequest | TB.SecuritySamlInvalidateRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecuritySamlInvalidateResponse, unknown>>;
    samlInvalidate(this: That, params: T.SecuritySamlInvalidateRequest | TB.SecuritySamlInvalidateRequest, options?: TransportRequestOptions): Promise<T.SecuritySamlInvalidateResponse>;
    /**
      * Submits a request to invalidate an access token and refresh token.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-saml-logout.html | Elasticsearch API documentation}
      */
    samlLogout(this: That, params: T.SecuritySamlLogoutRequest | TB.SecuritySamlLogoutRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecuritySamlLogoutResponse>;
    samlLogout(this: That, params: T.SecuritySamlLogoutRequest | TB.SecuritySamlLogoutRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecuritySamlLogoutResponse, unknown>>;
    samlLogout(this: That, params: T.SecuritySamlLogoutRequest | TB.SecuritySamlLogoutRequest, options?: TransportRequestOptions): Promise<T.SecuritySamlLogoutResponse>;
    /**
      * Creates a SAML authentication request (<AuthnRequest>) as a URL string, based on the configuration of the respective SAML realm in Elasticsearch.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-saml-prepare-authentication.html | Elasticsearch API documentation}
      */
    samlPrepareAuthentication(this: That, params?: T.SecuritySamlPrepareAuthenticationRequest | TB.SecuritySamlPrepareAuthenticationRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecuritySamlPrepareAuthenticationResponse>;
    samlPrepareAuthentication(this: That, params?: T.SecuritySamlPrepareAuthenticationRequest | TB.SecuritySamlPrepareAuthenticationRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecuritySamlPrepareAuthenticationResponse, unknown>>;
    samlPrepareAuthentication(this: That, params?: T.SecuritySamlPrepareAuthenticationRequest | TB.SecuritySamlPrepareAuthenticationRequest, options?: TransportRequestOptions): Promise<T.SecuritySamlPrepareAuthenticationResponse>;
    /**
      * Generate SAML metadata for a SAML 2.0 Service Provider.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-saml-sp-metadata.html | Elasticsearch API documentation}
      */
    samlServiceProviderMetadata(this: That, params: T.SecuritySamlServiceProviderMetadataRequest | TB.SecuritySamlServiceProviderMetadataRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecuritySamlServiceProviderMetadataResponse>;
    samlServiceProviderMetadata(this: That, params: T.SecuritySamlServiceProviderMetadataRequest | TB.SecuritySamlServiceProviderMetadataRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecuritySamlServiceProviderMetadataResponse, unknown>>;
    samlServiceProviderMetadata(this: That, params: T.SecuritySamlServiceProviderMetadataRequest | TB.SecuritySamlServiceProviderMetadataRequest, options?: TransportRequestOptions): Promise<T.SecuritySamlServiceProviderMetadataResponse>;
    /**
      * Get suggestions for user profiles that match specified search criteria.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-suggest-user-profile.html | Elasticsearch API documentation}
      */
    suggestUserProfiles(this: That, params?: T.SecuritySuggestUserProfilesRequest | TB.SecuritySuggestUserProfilesRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecuritySuggestUserProfilesResponse>;
    suggestUserProfiles(this: That, params?: T.SecuritySuggestUserProfilesRequest | TB.SecuritySuggestUserProfilesRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecuritySuggestUserProfilesResponse, unknown>>;
    suggestUserProfiles(this: That, params?: T.SecuritySuggestUserProfilesRequest | TB.SecuritySuggestUserProfilesRequest, options?: TransportRequestOptions): Promise<T.SecuritySuggestUserProfilesResponse>;
    /**
      * Updates attributes of an existing API key. Users can only update API keys that they created or that were granted to them. Use this API to update API keys created by the create API Key or grant API Key APIs. If you need to apply the same update to many API keys, you can use bulk update API Keys to reduce overhead. It’s not possible to update expired API keys, or API keys that have been invalidated by invalidate API Key. This API supports updates to an API key’s access scope and metadata. The access scope of an API key is derived from the `role_descriptors` you specify in the request, and a snapshot of the owner user’s permissions at the time of the request. The snapshot of the owner’s permissions is updated automatically on every call. If you don’t specify `role_descriptors` in the request, a call to this API might still change the API key’s access scope. This change can occur if the owner user’s permissions have changed since the API key was created or last modified. To update another user’s API key, use the `run_as` feature to submit a request on behalf of another user. IMPORTANT: It’s not possible to use an API key as the authentication credential for this API. To update an API key, the owner user’s credentials are required.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-update-api-key.html | Elasticsearch API documentation}
      */
    updateApiKey(this: That, params: T.SecurityUpdateApiKeyRequest | TB.SecurityUpdateApiKeyRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityUpdateApiKeyResponse>;
    updateApiKey(this: That, params: T.SecurityUpdateApiKeyRequest | TB.SecurityUpdateApiKeyRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityUpdateApiKeyResponse, unknown>>;
    updateApiKey(this: That, params: T.SecurityUpdateApiKeyRequest | TB.SecurityUpdateApiKeyRequest, options?: TransportRequestOptions): Promise<T.SecurityUpdateApiKeyResponse>;
    /**
      * Updates attributes of an existing cross-cluster API key.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-update-cross-cluster-api-key.html | Elasticsearch API documentation}
      */
    updateCrossClusterApiKey(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    updateCrossClusterApiKey(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    updateCrossClusterApiKey(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
    /**
      * Update settings for the security system index
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-update-settings.html | Elasticsearch API documentation}
      */
    updateSettings(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    updateSettings(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    updateSettings(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
    /**
      * Updates specific data for the user profile that's associated with the specified unique ID.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/security-api-update-user-profile-data.html | Elasticsearch API documentation}
      */
    updateUserProfileData(this: That, params: T.SecurityUpdateUserProfileDataRequest | TB.SecurityUpdateUserProfileDataRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SecurityUpdateUserProfileDataResponse>;
    updateUserProfileData(this: That, params: T.SecurityUpdateUserProfileDataRequest | TB.SecurityUpdateUserProfileDataRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SecurityUpdateUserProfileDataResponse, unknown>>;
    updateUserProfileData(this: That, params: T.SecurityUpdateUserProfileDataRequest | TB.SecurityUpdateUserProfileDataRequest, options?: TransportRequestOptions): Promise<T.SecurityUpdateUserProfileDataResponse>;
}
export {};
