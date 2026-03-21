import React from 'react';
import type { IconType } from '@elastic/eui';
export declare function hasIcon(icon: string | undefined): icon is string;
export type IconSet<T> = Array<{
    value: T;
    label: string;
    icon?: T | IconType;
    shouldRotate?: boolean;
}>;
export declare function IconSelect<Icon extends string>({ value, onChange, customIconSet, defaultIcon, }: {
    value?: Icon;
    onChange: (newIcon: Icon) => void;
    customIconSet: IconSet<Icon>;
    defaultIcon?: string;
}): React.JSX.Element;
export declare function IconSelectSetting<Icon extends string = string>({ currentIcon, setIcon, customIconSet, defaultIcon, }: {
    currentIcon?: Icon;
    setIcon: (icon: Icon) => void;
    customIconSet: IconSet<Icon>;
    defaultIcon?: string;
}): React.JSX.Element;
