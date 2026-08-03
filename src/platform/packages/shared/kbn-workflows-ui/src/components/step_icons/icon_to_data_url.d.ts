import type { IconType } from '@elastic/eui';
import React from 'react';
export type ImageComponent = React.ComponentType<{
    width: number;
    height: number;
}>;
export declare function getDataUrlFromReactComponent(component: ImageComponent, fallbackUrl: string): string;
export declare function resolveIconToDataUrl(icon: IconType | undefined, fallbackUrl: string): Promise<string>;
