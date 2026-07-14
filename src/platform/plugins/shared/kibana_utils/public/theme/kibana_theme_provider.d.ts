import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import type { Observable } from 'rxjs';
import type { EuiProviderProps } from '@elastic/eui';
import type { CoreTheme } from '@kbn/core-theme-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
export interface KibanaThemeProviderProps {
    theme$: Observable<CoreTheme>;
    userProfile?: UserProfileService;
    modify?: EuiProviderProps<{}>['modify'];
    children: React.ReactNode;
}
/** @deprecated use `KibanaThemeProvider` from `@kbn/react-kibana-context-theme */
export declare const KibanaThemeProvider: FC<PropsWithChildren<KibanaThemeProviderProps>>;
