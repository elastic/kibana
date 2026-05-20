import type { HttpSetup } from '@kbn/core/public';
import type { RulesSettingsFlapping } from '@kbn/alerting-types';
export declare const fetchFlappingSettings: ({ http }: {
    http: HttpSetup;
}) => Promise<RulesSettingsFlapping>;
