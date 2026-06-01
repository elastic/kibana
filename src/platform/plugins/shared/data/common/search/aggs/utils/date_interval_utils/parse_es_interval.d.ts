import type { Unit } from '@kbn/datemath';
export type ParsedInterval = ReturnType<typeof parseEsInterval>;
/**
 * Extracts interval properties from an ES interval string. Disallows unrecognized interval formats
 * and fractional values. Converts some intervals from "calendar" to "fixed" when the number of
 * units is larger than 1, and throws an error for others.
 *
 * Conversion rules:
 *
 * | Interval | Single unit type | Multiple units type |
 * | -------- | ---------------- | ------------------- |
 * | ms       | fixed            | fixed               |
 * | s        | fixed            | fixed               |
 * | m        | calendar         | fixed               |
 * | h        | calendar         | fixed               |
 * | d        | calendar         | fixed               |
 * | w        | calendar         | N/A - disallowed    |
 * | M        | calendar         | N/A - disallowed    |
 * | y        | calendar         | N/A - disallowed    |
 *
 */
export declare function parseEsInterval(interval: string): {
    value: number;
    unit: Unit;
    type: "fixed" | "calendar";
};
