import type { FC } from 'react';
/**
 * This component allows errors to be caught outside of a render tree, and re-thrown within a render tree
 * wrapped by KibanaErrorBoundary. The purpose is to let KibanaErrorBoundary control the user experience when
 * React can not render due to an error.
 *
 * @public
 */
export declare const ThrowIfError: FC<{
    error: Error | null;
}>;
