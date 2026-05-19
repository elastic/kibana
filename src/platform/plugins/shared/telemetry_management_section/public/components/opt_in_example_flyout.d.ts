import * as React from 'react';
/**
 * OptInExampleFlyout props
 */
export interface Props {
    /**
     * Method that provides the sample payload to show in the flyout
     */
    fetchExample: () => Promise<unknown[]>;
    /**
     * Hook called when the flyout is closed
     */
    onClose: () => void;
}
interface State {
    isLoading: boolean;
    hasPrivilegeToRead: boolean;
    data: unknown[] | null;
}
/**
 * React component for displaying the example data associated with the Telemetry opt-in banner.
 */
export declare class OptInExampleFlyout extends React.PureComponent<Props, State> {
    private _isMounted;
    readonly state: State;
    componentDidMount(): Promise<void>;
    componentWillUnmount(): void;
    private renderBody;
    render(): React.JSX.Element;
}
export {};
