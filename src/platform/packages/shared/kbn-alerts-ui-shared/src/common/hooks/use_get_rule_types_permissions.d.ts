import type { UseQueryOptions } from '@kbn/react-query';
import type { HttpStart } from '@kbn/core-http-browser';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import type { RuleTypeIndexWithDescriptions, RuleTypeWithDescription } from '@kbn/triggers-actions-ui-types';
export interface UseGetRuleTypesPermissionsParams {
    http: HttpStart;
    toasts: ToastsStart;
    filteredRuleTypes?: string[];
    registeredRuleTypes?: Array<{
        id: string;
        description: string;
    }>;
    enabled?: boolean;
    context?: UseQueryOptions['context'];
}
export declare const useGetRuleTypesPermissions: ({ http, toasts, filteredRuleTypes, registeredRuleTypes, context, enabled, }: UseGetRuleTypesPermissionsParams) => {
    ruleTypesState: {
        isInitialLoad: boolean;
        isLoading: boolean;
        data: RuleTypeIndexWithDescriptions;
        error: unknown;
    };
    hasAnyAuthorizedRuleType: boolean;
    authorizedRuleTypes: RuleTypeWithDescription[];
    authorizedToReadAnyRules: boolean;
    authorizedToCreateAnyRules: boolean;
    isSuccess: boolean;
};
