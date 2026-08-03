import type { ReactNode, ReactText } from 'react';
import React, { PureComponent } from 'react';
import type { Sample, SampleInput } from '../../types';
import type { FormatEditorProps } from '../types';
export declare const convertSampleInput: (converter: (input: SampleInput) => ReactNode, inputs: SampleInput[]) => {
    error: string | undefined;
    samples: Sample[];
};
interface SampleInputs {
    [key: string]: Array<ReactText[] | ReactText>;
}
export interface FormatEditorState {
    sampleInputs: SampleInput[];
    error?: string;
    samples: Sample[];
    sampleInputsByType: SampleInputs;
}
export declare const defaultState: {
    sampleInputs: SampleInput[];
    error: undefined;
    samples: Sample[];
    sampleInputsByType: {};
};
export declare class DefaultFormatEditor<P = {}, S = {}> extends PureComponent<FormatEditorProps<P>, FormatEditorState & S> {
    static formatId: string;
    state: FormatEditorState & S;
    static getDerivedStateFromProps(nextProps: FormatEditorProps<{}>, state: FormatEditorState): {
        error: string | undefined;
        samples: Sample[];
    };
    onChange: (newParams?: Partial<FormatEditorProps<P>["formatParams"]>) => void;
    render(): React.JSX.Element;
}
export {};
