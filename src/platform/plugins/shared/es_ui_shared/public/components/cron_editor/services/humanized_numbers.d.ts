export type DayOrdinal = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type MonthOrdinal = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
export declare function getOrdinalValue(number: number): string;
export declare function getDayName(dayOrdinal: DayOrdinal): string;
export declare function getMonthName(monthOrdinal: MonthOrdinal): string;
