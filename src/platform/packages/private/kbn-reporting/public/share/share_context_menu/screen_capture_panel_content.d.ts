import React, { Component } from 'react';
import type { ReportingPanelProps } from './reporting_panel_content';
export interface Props extends Omit<ReportingPanelProps, 'theme'> {
    layoutOption?: 'canvas' | 'print';
}
interface State {
    usePrintLayout: boolean;
    useCanvasLayout: boolean;
}
export declare class ScreenCapturePanelContent extends Component<Props, State> {
    constructor(props: Props);
    render(): React.JSX.Element;
    private renderOptions;
    private handlePrintLayoutChange;
    private handleCanvasLayoutChange;
    private getLayout;
    private getJobParams;
}
export {};
