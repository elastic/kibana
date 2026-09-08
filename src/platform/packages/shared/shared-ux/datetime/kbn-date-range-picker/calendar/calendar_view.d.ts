import React from 'react';
import { type DateRange } from 'react-day-picker';
import 'react-day-picker/style.css';
interface CalendarViewProps {
    /** The year to display. */
    year: number;
    /** Zero-based month index to display. */
    monthIndex: number;
    /** The selected date range. */
    range: DateRange | undefined;
    /** Callback to update the selected range. */
    setRange: (range?: DateRange) => void;
    /**
     * First day of the week: 0 for Sunday, 1 for Monday.
     * @default 0
     */
    firstDayOfWeek?: 0 | 1;
}
/**
 * Single-month calendar view backed by react-day-picker.
 */
export declare const CalendarView: ({ year, monthIndex, range, setRange, firstDayOfWeek, }: CalendarViewProps) => React.JSX.Element;
export {};
