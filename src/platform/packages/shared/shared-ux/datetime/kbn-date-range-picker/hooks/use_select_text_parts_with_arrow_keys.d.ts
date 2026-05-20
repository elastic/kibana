import { type RefObject } from 'react';
export interface TextPart {
    text: string;
    start: number;
    end: number;
}
interface UseSelectTextPartsOptions {
    /** Ref to the input element */
    inputRef: RefObject<HTMLInputElement>;
    /** Whether the hook is active (e.g. when the input is mounted) */
    isActive: boolean;
    /**
     * What to select when the hook first becomes active.
     * - `'all'` selects the entire input text (default)
     * - `'first'` selects the first text part
     * - `'none'` leaves the caret as-is
     * @default 'all'
     */
    initialSelection?: 'none' | 'first' | 'all';
    /**
     * Called when ArrowUp/ArrowDown is pressed on a selected part.
     * Return the new full input text, or `undefined` to skip the modification.
     */
    onModifyPart?: (params: {
        text: string;
        part: TextPart;
        action: 'increase' | 'decrease';
    }) => string | undefined;
}
/**
 * Hook to navigate through the text parts of a text input with arrow keys.
 * Optionally supports modifying parts via ArrowUp/ArrowDown when `onModifyPart` is provided.
 */
export declare function useSelectTextPartsWithArrowKeys({ inputRef, isActive, initialSelection, onModifyPart, }: UseSelectTextPartsOptions): void;
export {};
