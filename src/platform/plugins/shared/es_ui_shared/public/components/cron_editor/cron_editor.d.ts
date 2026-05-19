import React, { Component } from 'react';
import type { Frequency, FieldToValueMap } from './types';
interface Props {
    frequencyBlockList?: string[];
    fieldToPreferredValueMap: FieldToValueMap;
    frequency: Frequency;
    cronExpression: string;
    onChange: ({ cronExpression, fieldToPreferredValueMap, frequency, }: {
        cronExpression: string;
        fieldToPreferredValueMap: FieldToValueMap;
        frequency: Frequency;
    }) => void;
    autoFocus?: boolean;
}
type State = FieldToValueMap;
export declare class CronEditor extends Component<Props, State> {
    static getDerivedStateFromProps(props: Props): FieldToValueMap;
    constructor(props: Props);
    onChangeFrequency: (frequency: Frequency) => void;
    onChangeFields: (fields: FieldToValueMap) => void;
    renderForm(): React.JSX.Element | undefined;
    render(): React.JSX.Element;
}
export {};
