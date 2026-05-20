import React from 'react';
import type { CopyToDashboardAPI } from './copy_to_dashboard_action';
interface CopyToDashboardModalProps {
    api: CopyToDashboardAPI;
    closeModal: () => void;
}
export declare function CopyToDashboardModal({ api, closeModal }: CopyToDashboardModalProps): React.JSX.Element;
export {};
