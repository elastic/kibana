import React from 'react';
import type { EnvironmentName } from '../../../common/labs';
export interface Props {
    env: EnvironmentName;
    isChecked: boolean;
    onChange: (checked: boolean) => void;
    name: string;
}
export declare const EnvironmentSwitch: ({ env, isChecked, onChange, name }: Props) => React.JSX.Element;
