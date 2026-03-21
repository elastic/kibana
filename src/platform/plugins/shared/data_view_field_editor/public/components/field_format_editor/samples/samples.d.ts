import React, { PureComponent } from 'react';
import type { Sample } from '../types';
interface FormatEditorSamplesProps {
    samples: Sample[];
    sampleType: string;
}
export declare class FormatEditorSamples extends PureComponent<FormatEditorSamplesProps> {
    static defaultProps: {
        sampleType: string;
    };
    render(): React.JSX.Element | null;
}
export {};
