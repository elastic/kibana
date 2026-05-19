import type { ReactNode } from 'react';
export declare function renderSearchError(error: Error): {
    title: string;
    body: ReactNode;
    actions?: ReactNode[];
} | undefined;
