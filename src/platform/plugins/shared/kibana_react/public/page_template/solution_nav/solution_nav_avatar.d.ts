import type { FunctionComponent } from 'react';
import type { DistributiveOmit, EuiAvatarProps } from '@elastic/eui';
export type KibanaPageTemplateSolutionNavAvatarProps = DistributiveOmit<EuiAvatarProps, 'size'> & {
    /**
     * Any EuiAvatar size available, of `xxl` for custom large, brand-focused version
     */
    size?: EuiAvatarProps['size'] | 'xxl';
};
/**
 * Applies extra styling to a typical EuiAvatar
 */
export declare const KibanaPageTemplateSolutionNavAvatar: FunctionComponent<KibanaPageTemplateSolutionNavAvatarProps>;
