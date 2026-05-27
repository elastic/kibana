import * as React from 'react';
import type { ChromeDocTitle } from '@kbn/core-chrome-browser';
export interface ErrorProps {
    title?: string;
    body?: string;
    homeHref: string;
    docTitle: ChromeDocTitle;
    error: Error;
}
export declare const RedirectEmptyPrompt: React.FC<ErrorProps>;
