import type { FieldSpec } from '@kbn/data-views-plugin/common';
import React from 'react';
export interface GroupByOptions {
    text: string;
    field: string;
}
interface Props {
    onSubmit: (field: string) => void;
    fields: FieldSpec[];
    currentOptions: GroupByOptions[];
}
interface SelectedOption {
    label: string;
}
declare const initialState: {
    selectedOptions: SelectedOption[];
};
type State = Readonly<typeof initialState>;
export declare class CustomFieldPanel extends React.PureComponent<Props, State> {
    static displayName: string;
    readonly state: State;
    render(): React.JSX.Element;
    private handleSubmit;
    private handleFieldSelection;
}
export {};
