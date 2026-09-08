import React from 'react';
import type { RangePart } from './parse/parse_range_parts';
interface DateRangeValueDisplayProps {
    /** The full display text to render, e.g. "Last 15 minutes". */
    displayText: string;
    /** Invoked when the user clicks a navigable part of the display text. */
    onPartClick: (part: RangePart) => void;
    /** When true, parts are rendered as plain text and click handlers are not attached. */
    disabled?: boolean;
    /** Locale used to recognise `displayText`'s parts. @default `i18n.getLocale()` */
    locale?: string;
}
/**
 * Renders display text with individually hoverable, clickable date range parts.
 */
export declare function DateRangeValueDisplay({ displayText, onPartClick, disabled, locale, }: DateRangeValueDisplayProps): React.JSX.Element;
export {};
