import type { EuiCollapsibleNavProps } from '@elastic/eui';
import React from 'react';
interface Props {
    id: string;
    isNavOpen: boolean;
    storage?: Storage;
    closeNav: () => void;
    button: EuiCollapsibleNavProps['button'];
}
export declare function CollapsibleNav({ id, isNavOpen, storage, closeNav, button, }: Props): React.JSX.Element;
export {};
