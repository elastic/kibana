import React, { type ComponentProps } from 'react';
import { EuiDragDropContext } from '@elastic/eui';
interface SelectionListComponentProps extends Pick<ComponentProps<typeof EuiDragDropContext>, 'onDragEnd'> {
    selectionListItems: string[];
}
export declare function SelectedListComponent({ selectionListItems, onDragEnd, }: SelectionListComponentProps): React.JSX.Element;
export {};
