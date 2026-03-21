import type { PropsWithChildren } from 'react';
import React from 'react';
/**
 * DropOverlayWrapper Props
 */
export interface DropOverlayWrapperProps {
    isVisible: boolean;
    className?: string;
    overlayProps?: object;
}
/**
 * This prevents the in-place droppable styles (under children) and allows to rather show an overlay with droppable styles (on top of children)
 * @param isVisible
 * @param children
 * @param overlayProps
 * @param className
 * @param otherProps
 * @constructor
 */
export declare const DropOverlayWrapper: React.FC<PropsWithChildren<DropOverlayWrapperProps>>;
