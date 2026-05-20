import React from 'react';
import type { DateRange } from 'react-day-picker';
interface CalendarProps {
    /** The selected date range. */
    range: DateRange | undefined;
    /** Callback when the user changes the selected range. */
    onRangeChange: (range: DateRange | undefined) => void;
    /**
     * First day of the week: 0 for Sunday, 1 for Monday.
     * @default 0
     */
    firstDayOfWeek?: 0 | 1;
}
/** Infinite-like month calendar using a fixed window with chunked prepend/append. */
export declare function Calendar({ range, onRangeChange, firstDayOfWeek }: CalendarProps): React.JSX.Element;
export {};
