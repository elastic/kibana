import React from 'react';
import type { ActionType } from '@kbn/actions-types';
export declare const getLicenseCheckResult: (actionType: ActionType) => {
    isEnabled: boolean;
    message: string;
    messageCard: React.JSX.Element;
};
export declare const configurationCheckResult: {
    isEnabled: boolean;
    message: string;
    messageCard: React.JSX.Element;
};
