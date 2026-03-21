import type { RuleType as CommonRuleType } from '@kbn/alerting-types';
import type { ActionVariables } from './action_variable_types';
export interface RuleType<ActionGroupIds extends string = string, RecoveryActionGroupId extends string = string> extends Pick<CommonRuleType<ActionGroupIds, RecoveryActionGroupId>, 'id' | 'name' | 'actionGroups' | 'producer' | 'minimumLicenseRequired' | 'recoveryActionGroup' | 'defaultActionGroupId' | 'ruleTaskTimeout' | 'defaultScheduleInterval' | 'doesSetRecoveryContext' | 'category' | 'isExportable' | 'autoRecoverAlerts'> {
    actionVariables: ActionVariables;
    authorizedConsumers: Record<string, {
        read: boolean;
        all: boolean;
    }>;
    enabledInLicense: boolean;
    hasAlertsMappings?: boolean;
    isInternallyManaged: boolean;
}
export type RuleTypeIndex = Map<string, RuleType>;
export type RuleTypeWithDescription = RuleType<string, string> & {
    description?: string;
};
export type RuleTypeIndexWithDescriptions = Map<string, RuleTypeWithDescription>;
