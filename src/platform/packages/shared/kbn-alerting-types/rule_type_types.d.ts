import type { LicenseType } from '@kbn/licensing-types';
import type { RecoveredActionGroupId, DefaultActionGroupId } from './builtin_action_groups_types';
import type { ActionGroup } from './action_group_types';
import type { ActionVariable } from './action_variable';
interface ConsumerPrivileges {
    read: boolean;
    all: boolean;
}
export interface RuleType<ActionGroupIds extends Exclude<string, RecoveredActionGroupId> = DefaultActionGroupId, RecoveryActionGroupId extends string = RecoveredActionGroupId> {
    id: string;
    name: string;
    actionGroups: Array<ActionGroup<ActionGroupIds>>;
    recoveryActionGroup: ActionGroup<RecoveryActionGroupId>;
    actionVariables: {
        context: ActionVariable[];
        state: ActionVariable[];
        params: ActionVariable[];
    };
    defaultActionGroupId: ActionGroupIds;
    category: string;
    producer: string;
    minimumLicenseRequired: LicenseType;
    isExportable: boolean;
    ruleTaskTimeout?: string;
    defaultScheduleInterval?: string;
    doesSetRecoveryContext?: boolean;
    enabledInLicense: boolean;
    authorizedConsumers: Record<string, ConsumerPrivileges>;
    autoRecoverAlerts?: boolean;
}
export type ActionGroupIdsOf<T> = T extends ActionGroup<infer groups> ? groups : T extends Readonly<ActionGroup<infer groups>> ? groups : never;
export {};
