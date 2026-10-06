import React from 'react';
import type { DistributiveOmit, EuiAvatarProps, IconType } from '@elastic/eui';
import type { SolutionNameType } from './types';
export type KnownSolutionProps = DistributiveOmit<EuiAvatarProps, 'size' | 'name' | 'iconType'> & {
    /**
     * Any EuiAvatar size available, or `xxl` for custom large, brand-focused version
     */
    size?: EuiAvatarProps['size'] | 'xxl';
    name: SolutionNameType;
};
export type IconTypeProps = DistributiveOmit<EuiAvatarProps, 'size' | 'name' | 'iconType'> & {
    /**
     * Any EuiAvatar size available, or `xxl` for custom large, brand-focused version
     */
    size?: EuiAvatarProps['size'] | 'xxl';
    name?: string;
    iconType: IconType;
};
export type KibanaSolutionAvatarProps = KnownSolutionProps | IconTypeProps;
/**
 * Applies extra styling to a typical EuiAvatar.
 * The `name` value will be appended to 'logo' to configure the `iconType` unless `iconType` is provided.
 */
export declare const KibanaSolutionAvatar: (props: KibanaSolutionAvatarProps) => React.JSX.Element;
