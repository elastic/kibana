import type { FC, PropsWithChildren } from 'react';
import type { EuiProviderProps } from '@elastic/eui';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import type { ThemeServiceStart } from '@kbn/react-kibana-context-common';
/**
 * Props for the KibanaEuiProvider.
 */
export interface KibanaEuiProviderProps extends Pick<EuiProviderProps<{}>, 'modify' | 'colorMode'> {
    theme: ThemeServiceStart;
    userProfile?: Pick<UserProfileService, 'getUserProfile$'>;
    globalStyles?: boolean;
}
/**
 * Prepares and returns a configured `EuiProvider` for use in Kibana roots.  In most cases, this utility context
 * should not be used.  Instead, refer to `KibanaRootContextProvider` to set up the root of Kibana.
 */
export declare const KibanaEuiProvider: FC<PropsWithChildren<KibanaEuiProviderProps>>;
