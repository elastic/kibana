import React from 'react';
import type { ActionVariable } from '@kbn/alerting-types';
interface Props {
    buttonTitle?: string;
    messageVariables?: ActionVariable[];
    paramsProperty: string;
    onSelectEventHandler: (variable: ActionVariable) => void;
    showButtonTitle?: boolean;
}
export declare const AddMessageVariables: React.FunctionComponent<Props>;
export {};
