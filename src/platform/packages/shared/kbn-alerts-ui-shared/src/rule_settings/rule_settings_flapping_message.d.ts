import React from 'react';
export declare const flappingOffMessage: string;
export interface RuleSettingsFlappingMessageProps {
    lookBackWindow: number;
    statusChangeThreshold: number;
    isUsingRuleSpecificFlapping: boolean;
}
export declare const RuleSettingsFlappingMessage: (props: RuleSettingsFlappingMessageProps) => React.JSX.Element;
