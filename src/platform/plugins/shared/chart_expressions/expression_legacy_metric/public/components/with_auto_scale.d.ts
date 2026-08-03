import type { ComponentType, CSSProperties } from 'react';
import React from 'react';
interface AutoScaleParams {
    autoScaleMetricAlignment?: 'left' | 'center' | 'right';
    minScale?: number;
    containerStyles: CSSProperties;
}
interface AutoScaleProps {
    autoScaleParams?: AutoScaleParams;
    renderComplete?: () => void;
}
interface ClientDimensionable {
    clientWidth: number;
    clientHeight: number;
}
/**
 * computeScale computes the ratio by which the child needs to shrink in order
 * to fit into the parent. This function is only exported for testing purposes.
 */
export declare function computeScale(parent: ClientDimensionable | null, child: ClientDimensionable | null, minScale?: number): number;
export declare function withAutoScale<T>(WrappedComponent: ComponentType<T>): (props: T & AutoScaleProps) => React.JSX.Element;
export {};
