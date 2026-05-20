import React from 'react';
import type { EuiCallOutProps } from '@elastic/eui';
export interface DeleteManagedAssetsCalloutProps extends EuiCallOutProps {
    assetName: string;
    overrideBody?: string;
}
export declare const DeleteManagedAssetsCallout: ({ assetName, overrideBody, ...overrideCalloutProps }: DeleteManagedAssetsCalloutProps) => React.JSX.Element;
