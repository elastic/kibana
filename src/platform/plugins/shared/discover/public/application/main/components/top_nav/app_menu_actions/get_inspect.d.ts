import { type DiscoverAppMenuItemType } from '@kbn/discover-utils';
export declare const getInspectAppMenuItem: ({ onOpenInspector, }: {
    onOpenInspector: (onClose?: () => void) => void;
}) => DiscoverAppMenuItemType;
