import type { NativeAPIKeysType } from './api_keys';
import type { NativeAPIKeysWithContextType } from './api_keys_context';
import type { UiamAPIKeysType, UiamAPIKeysWithContextType } from './uiam';
export type { NativeAPIKeysType, CreateAPIKeyParams, CreateAPIKeyResult, InvalidateAPIKeyResult, InvalidateAPIKeysParams, ValidateAPIKeyParams, CreateRestAPIKeyParams, CreateRestAPIKeyWithKibanaPrivilegesParams, CreateCrossClusterAPIKeyParams, GrantAPIKeyResult, CloneAPIKeyParams, CloneAPIKeyResult, UpdateAPIKeyParams, UpdateAPIKeyResult, UpdateCrossClusterAPIKeyParams, UpdateRestAPIKeyParams, UpdateRestAPIKeyWithKibanaPrivilegesParams, } from './api_keys';
export type { NativeAPIKeysWithContextType } from './api_keys_context';
export { isCreateRestAPIKeyParams } from './api_keys';
export { extractApiKeyIdFromAuthzHeader, decodeApiKeyId } from './utils';
export type { UiamAPIKeysType, UiamAPIKeysWithContextType, GrantUiamAPIKeyParams, InvalidateUiamAPIKeyParams, ConvertUiamAPIKeyResult, ConvertUiamAPIKeyResultSuccess, ConvertUiamAPIKeyResultFailed, ConvertUiamAPIKeysResponse, } from './uiam';
export interface APIKeysType extends NativeAPIKeysType {
    uiam: UiamAPIKeysType | null;
}
export interface APIKeysWithContextType extends NativeAPIKeysWithContextType {
    uiam: UiamAPIKeysWithContextType | null;
}
