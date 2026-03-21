import React from 'react';
interface VisualizationErrorProps {
    onInit?: () => void;
    error: string | Error;
}
export declare class VisualizationError extends React.Component<VisualizationErrorProps> {
    render(): React.JSX.Element;
    componentDidMount(): void;
    componentDidUpdate(): void;
    private afterRender;
}
export default VisualizationError;
