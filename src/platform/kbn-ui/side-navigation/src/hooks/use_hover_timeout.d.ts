/**
 * Hook for managing hover timeouts.
 *
 * @returns an object containing:
 * - `setHoverTimeout` - a function to set a hover timeout.
 * - `clearHoverTimeout` - a function to clear the hover timeout.
 */
export declare const useHoverTimeout: () => {
    setHoverTimeout: (callback: () => void, delay: number) => void;
    clearHoverTimeout: () => void;
};
