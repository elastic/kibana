import type { HttpStart } from '@kbn/core-http-browser';
import type { RulesSettingsFlapping } from '@kbn/alerting-types/rule_settings';
interface UseFetchFlappingSettingsProps {
    http: HttpStart;
    enabled: boolean;
    onSuccess?: (settings: RulesSettingsFlapping) => void;
}
export declare const useFetchFlappingSettings: (props: UseFetchFlappingSettingsProps) => {
    isInitialLoading: boolean;
    isLoading: boolean;
    isError: boolean;
    data: RulesSettingsFlapping | undefined;
};
export {};
