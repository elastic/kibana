import React from 'react';
/**
 * Error boundary that intercepts {@link InvalidRouteParamsException} thrown by
 * `router.matchRoutes` (or the `useMatchRoutes` hook) and attempts to self-heal
 * the URL by replacing malformed query parameters with their route-defined defaults.
 *
 * When an `InvalidRouteParamsException` is caught, the component calls
 * `history.replace` with the corrected query string carried in the exception's
 * `patched` payload, triggering a re-render with valid params.
 *
 * Errors that are **not** `InvalidRouteParamsException` (including unrecoverable
 * decode failures) are always re-thrown upward.
 */
export declare function RouteSelfHealErrorBoundary({ children }: {
    children: React.ReactNode;
}): React.JSX.Element;
