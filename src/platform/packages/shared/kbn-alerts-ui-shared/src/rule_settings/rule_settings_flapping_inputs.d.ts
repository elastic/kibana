import React from 'react';
export interface RuleSettingsFlappingInputsProps {
    lookBackWindow: number;
    statusChangeThreshold: number;
    isDisabled?: boolean;
    onLookBackWindowChange: (value: number) => void;
    onStatusChangeThresholdChange: (value: number) => void;
}
export declare const RuleSettingsFlappingInputs: (props: RuleSettingsFlappingInputsProps) => React.JSX.Element;
