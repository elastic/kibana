import React from 'react';
import type { CoreStart, ChromeBreadcrumb, ScopedHistory } from '@kbn/core/public';
declare const SavedObjectsEditionPage: ({ coreStart, setBreadcrumbs, history, }: {
    coreStart: CoreStart;
    setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
    history: ScopedHistory;
}) => React.JSX.Element;
export { SavedObjectsEditionPage as default };
