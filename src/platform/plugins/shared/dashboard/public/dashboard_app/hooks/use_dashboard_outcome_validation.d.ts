import type { ReadBodyWithResolve } from '../../dashboard_client/dashboard_client';
export declare const useDashboardOutcomeValidation: () => {
    validateOutcome: (result: ReadBodyWithResolve) => "valid" | "invalid" | "redirected";
    getLegacyConflictWarning: (() => import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>> | undefined) | null;
};
