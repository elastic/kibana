import React from 'react';
interface VisualizationNoResultsProps {
    onInit?: () => void;
}
export declare class VisualizationNoResults extends React.Component<VisualizationNoResultsProps> {
    render(): React.JSX.Element;
    componentDidMount(): void;
    componentDidUpdate(): void;
    private afterRender;
}
export default VisualizationNoResults;
