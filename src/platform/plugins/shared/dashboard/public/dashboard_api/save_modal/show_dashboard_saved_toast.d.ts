interface ShowDashboardSavedToastParams {
    /** The id returned by the save call, i.e. the dashboard that was just saved. */
    savedDashboardId: string;
    /** The dashboard title to interpolate into the toast message. */
    dashboardTitle: string;
}
/**
 * Renders the dashboard save success toast. When the user is outside the
 * Dashboard app (for example the chat sidebar or a portable dashboard in a
 * flyout), the toast also includes a "Go to dashboard" button that navigates
 * to the saved dashboard. Inside the Dashboard app the save flow already
 * places the user on the saved dashboard, so the button is omitted.
 */
export declare const showDashboardSavedToast: ({ savedDashboardId, dashboardTitle, }: ShowDashboardSavedToastParams) => void;
export {};
