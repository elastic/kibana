import type { ReactNode } from 'react';
import type { EuiBreadcrumb } from '@elastic/eui';
import type { AppDeepLinkId } from './project_navigation';
/** @public */
export interface ChromeBreadcrumb extends EuiBreadcrumb {
    /**
     * The deepLinkId can be used to merge the navigational breadcrumbs set via project navigation
     * with the deeper context breadcrumbs set via the `chrome.setBreadcrumbs` API.
     */
    deepLinkId?: AppDeepLinkId;
}
/**
 * @example
 * Append a React element next to the breadcrumbs (recommended):
 * ```tsx
 * chrome.setBreadcrumbsAppendExtension({ content: <MyBadge />, order: 10 });
 * ```
 *
 * @public
 */
export interface ChromeBreadcrumbsAppendExtension {
    /**
     * The extension content as a React node.
     */
    content?: ReactNode;
    /** The order in which the extension should be appended to the breadcrumbs. Default is 50 */
    order?: number;
}
/** @public */
export interface ChromeSetBreadcrumbsParams {
    /**
     * Declare the breadcrumbs for the project/solution type navigation in stateful.
     * Those breadcrumbs correspond to the serverless breadcrumbs declaration.
     */
    project?: {
        /**
         * The breadcrumb value to set. Can be a single breadcrumb or an array of breadcrumbs.
         */
        value: ChromeBreadcrumb | ChromeBreadcrumb[];
        /**
         * Indicates whether the breadcrumb should be absolute (replaces the full path) or relative.
         * @default false
         */
        absolute?: boolean;
    };
}
