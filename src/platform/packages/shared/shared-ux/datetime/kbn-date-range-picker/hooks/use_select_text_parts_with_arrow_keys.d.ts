import { type RefObject } from 'react';
import type { DateType, ModificationAction } from '../types';
import { type RangePart } from '../parse/parse_range_parts';
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
    /** The start and end types used to assign collapsed inputs to the correct side. */
    rangeType?: [DateType, DateType];
    /** Locale used to recognise the input's parts. @default `i18n.getLocale()` */
    locale?: string;
    /**
     * Called when ArrowUp/ArrowDown is pressed on a selected part.
     * Return the new full input text, or `undefined` to skip the modification.
     */
    onModifyPart?: (params: {
        text: string;
        part: RangePart;
        parts: RangePart[];
        action: ModificationAction;
    }) => string | undefined;
}
/**
 * Hook to navigate through the text parts of a text input with arrow keys.
 * Optionally supports modifying parts via ArrowUp/ArrowDown when `onModifyPart` is provided.
 */
export declare function useSelectTextPartsWithArrowKeys({ inputRef, isActive, initialSelection, rangeType, locale, onModifyPart, }: UseSelectTextPartsOptions): void;
export {};
