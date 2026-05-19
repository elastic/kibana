import React from 'react';
import type { Dispatch, SetStateAction } from 'react';
interface Props {
    setIsMeasuring: Dispatch<SetStateAction<boolean>>;
}
/**
 * MeasureOverlay provides visual measurements between components.
 * - Click to select an anchor element.
 * - Hover over other elements to see spacing distances between anchor and hovered element.
 * - Click again to select a new anchor, or press Escape to exit.
 */
export declare const MeasureOverlay: ({ setIsMeasuring }: Props) => React.JSX.Element;
export {};
