import React from 'react';
import type { Error } from '../types';
interface Props {
    title: React.ReactNode;
    error?: Error;
    actions?: JSX.Element;
    isCentered?: boolean;
}
export declare const PageError: React.FunctionComponent<Props>;
export {};
