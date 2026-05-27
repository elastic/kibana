import React from 'react';
import type { IApplicationUsageTracker } from '../../plugin';
import type { TrackApplicationViewProps } from './types';
interface Props extends TrackApplicationViewProps {
    applicationUsageTracker?: IApplicationUsageTracker;
}
export declare class TrackApplicationViewComponent extends React.Component<Props> {
    private parentNode;
    onClick: (e: MouseEvent) => void;
    componentDidMount(): void;
    componentWillUnmount(): void;
    render(): React.ReactNode;
}
export {};
