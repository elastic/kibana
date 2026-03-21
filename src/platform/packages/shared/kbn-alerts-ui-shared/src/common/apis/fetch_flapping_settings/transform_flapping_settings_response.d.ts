import type { AsApiContract } from '@kbn/actions-types';
import type { RulesSettingsFlapping } from '@kbn/alerting-types';
export declare const transformFlappingSettingsResponse: ({ look_back_window: lookBackWindow, status_change_threshold: statusChangeThreshold, created_at: createdAt, created_by: createdBy, updated_at: updatedAt, updated_by: updatedBy, ...rest }: AsApiContract<RulesSettingsFlapping>) => RulesSettingsFlapping;
