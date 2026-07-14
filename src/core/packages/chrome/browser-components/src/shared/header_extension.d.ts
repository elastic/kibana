import React from 'react';
import { type ChromeExtensionContent } from '@kbn/core-mount-utils-browser';
interface Props {
    extension?: ChromeExtensionContent<HTMLDivElement>;
    display?: 'block' | 'inlineBlock';
    containerClassName?: string;
}
export declare const HeaderExtension: ({ extension, display, containerClassName }: Props) => React.JSX.Element | null;
export {};
