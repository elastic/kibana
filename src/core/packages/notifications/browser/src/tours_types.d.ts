/**
 * Exposes public API of the Tours service during the start phase.
 * @public
 */
export interface ToursStart {
    /**
     * Returns whether guided tours are allowed to be shown.
     */
    isEnabled(): boolean;
}
