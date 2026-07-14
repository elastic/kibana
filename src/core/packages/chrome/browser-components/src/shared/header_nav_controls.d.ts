import React from 'react';
import { type NavControlPosition } from './chrome_hooks';
interface Props {
    position: NavControlPosition;
    append?: JSX.Element | null;
}
export declare function HeaderNavControls({ position, append }: Props): React.JSX.Element | null;
export {};
