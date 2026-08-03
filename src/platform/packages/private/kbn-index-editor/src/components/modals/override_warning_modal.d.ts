import React from 'react';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { KibanaContextExtra } from '../../types';
interface OverrideWarningModalProps {
    onCancel: () => void;
    onContinue: () => void;
    storage: Storage;
}
export declare const OverrideWarningModal: React.FC<OverrideWarningModalProps>;
export declare const getOverrideConfirmation: ({ overlays, rendering, storage, indexUpdateService, }: KibanaContextExtra) => Promise<boolean>;
export {};
