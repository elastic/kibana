import type { KeyboardEvent } from 'react';
import React from 'react';
import { type DraggableProvidedDragHandleProps } from '@elastic/eui';
import { type EditTabLabelProps } from './edit_tab_label';
import type { TabItem, TabsSizeConfig, GetTabMenuItems, TabsServices } from '../../types';
import { type TabPreviewData } from '../../types';
export interface TabProps {
    item: TabItem;
    isSelected: boolean;
    selectedItemId?: string;
    isUnsaved?: boolean;
    isDragging?: boolean;
    hideRightSeparator?: boolean;
    onHoverChange?: (itemId: string, isHovered: boolean) => void;
    dragHandleProps?: DraggableProvidedDragHandleProps | null;
    tabContentId: string;
    tabsSizeConfig: TabsSizeConfig;
    getTabMenuItems?: GetTabMenuItems;
    getPreviewData?: (item: TabItem) => TabPreviewData;
    services: TabsServices;
    onLabelEdited: EditTabLabelProps['onLabelEdited'];
    onSelect: (item: TabItem) => Promise<void>;
    onClose: ((item: TabItem) => Promise<void>) | undefined;
    onSelectedTabKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => Promise<void>;
    disableCloseButton?: boolean;
    disableInlineLabelEditing?: boolean;
    disableDragAndDrop?: boolean;
}
export declare const Tab: React.FC<TabProps>;
