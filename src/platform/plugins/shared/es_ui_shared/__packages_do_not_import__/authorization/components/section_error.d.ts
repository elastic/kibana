import React from 'react';
import type { Error } from '../types';
interface Props {
    title: React.ReactNode;
    error: Error;
    actions?: JSX.Element;
}
export declare const SectionError: React.FunctionComponent<Props>;
export {};
