import React from 'react';
import type { BaseVisType, TypesStart } from '../../vis_types';
interface AggBasedSelectionProps {
    openedAsRoot?: boolean;
    onVisTypeSelected: (visType: BaseVisType) => void;
    visTypesRegistry: TypesStart;
    showMainDialog: (flag: boolean) => void;
}
interface AggBasedSelectionState {
    query: string;
}
declare class AggBasedSelection extends React.Component<AggBasedSelectionProps, AggBasedSelectionState> {
    state: AggBasedSelectionState;
    private readonly getFilteredVisTypes;
    render(): React.JSX.Element;
    private filteredVisTypes;
    private renderVisType;
    private onQueryChange;
}
export { AggBasedSelection };
