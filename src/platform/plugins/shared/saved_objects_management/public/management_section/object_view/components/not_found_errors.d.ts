import React from 'react';
import type { DocLinksStart } from '@kbn/core/public';
interface NotFoundErrors {
    type: string;
    docLinks: DocLinksStart['links'];
}
export declare const NotFoundErrors: ({ type, docLinks }: NotFoundErrors) => React.JSX.Element;
export {};
