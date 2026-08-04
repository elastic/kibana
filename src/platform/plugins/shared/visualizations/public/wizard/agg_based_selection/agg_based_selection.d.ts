import React from 'react';
import type { BaseVisType, TypesStart } from '../../vis_types';
interface AggBasedSelectionProps {
    openedAsRoot?: boolean;
    onVisTypeSelected: (visType: BaseVisType) => void;
    visTypesRegistry: TypesStart;
    showMainDialog: (flag: boolean) => void;
}
export declare function AggBasedSelection(props: AggBasedSelectionProps): React.JSX.Element;
export {};
