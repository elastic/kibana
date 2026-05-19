/**
 * Returns a session ID for the current user.
 * We are storing it to the sessionStorage. This means it remains the same through refreshes,
 * but it is not persisted when closing the browser/tab or manually navigating to another URL.
 */
export declare function getSessionId(): string;
