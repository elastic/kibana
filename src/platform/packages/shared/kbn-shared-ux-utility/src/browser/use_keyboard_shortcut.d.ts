export interface KeyboardShortcut {
    key: string;
    /** Cmd on Mac, Ctrl on other platforms. */
    meta?: boolean;
    shift?: boolean;
    alt?: boolean;
    /** Literal Ctrl on all platforms (distinct from meta on Mac). */
    ctrl?: boolean;
}
export declare function useKeyboardShortcut(shortcut: KeyboardShortcut | undefined, callback: (() => void) | undefined): void;
