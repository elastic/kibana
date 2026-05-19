import React from 'react';
import type { EuiIconProps } from '@elastic/eui';
import type { CloudProvider } from './get_cloud_provider_icon';
export interface CloudProviderIconProps extends Omit<EuiIconProps, 'type'> {
    cloudProvider?: CloudProvider;
}
export declare function CloudProviderIcon({ cloudProvider, ...props }: CloudProviderIconProps): React.JSX.Element;
