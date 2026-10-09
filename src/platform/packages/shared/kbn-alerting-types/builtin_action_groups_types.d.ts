import type { ActionGroup } from './action_group_types';
export declare const RecoveredActionGroup: Readonly<ActionGroup<'recovered'>>;
export type DefaultActionGroupId = 'default';
export type RecoveredActionGroupId = (typeof RecoveredActionGroup)['id'];
