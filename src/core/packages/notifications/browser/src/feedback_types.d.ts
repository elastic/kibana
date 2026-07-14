/**
 * Exposes public API of the Feedback service during the start phase.
 * @public
 */
export interface FeedbackStart {
    /**
     * Returns whether feedback elements are allowed to be shown.
     */
    isEnabled(): boolean;
}
