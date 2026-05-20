import React from 'react';
import type { DiscoverServices } from '../../../../../build_services';
export interface DiscoverSessionSaveModalContainerProps {
    initialCopyOnSave?: boolean;
    onClose: () => void;
    onSaveCb?: () => void;
    services: DiscoverServices;
}
export declare const DiscoverSessionSaveModalContainer: ({ initialCopyOnSave, onClose, onSaveCb, services, }: DiscoverSessionSaveModalContainerProps) => React.JSX.Element;
