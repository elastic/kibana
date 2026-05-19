import type { ReactNode } from 'react';
import React from 'react';
import type { CoreStart } from '@kbn/core/public';
export declare function RedirectToHomeIfUnauthorized({ coreStart, children, }: {
    coreStart: CoreStart;
    children: ReactNode;
}): React.JSX.Element | null;
