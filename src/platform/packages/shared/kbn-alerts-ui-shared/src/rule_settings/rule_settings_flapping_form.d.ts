import React from 'react';
import type { RuleSpecificFlappingProperties, RulesSettingsFlapping } from '@kbn/alerting-types';
export interface RuleSettingsFlappingFormProps {
    flappingSettings?: RuleSpecificFlappingProperties | null;
    spaceFlappingSettings?: RulesSettingsFlapping;
    canWriteFlappingSettingsUI: boolean;
    onFlappingChange: (value: RuleSpecificFlappingProperties | null) => void;
}
export declare const RuleSettingsFlappingForm: (props: RuleSettingsFlappingFormProps) => React.JSX.Element;
