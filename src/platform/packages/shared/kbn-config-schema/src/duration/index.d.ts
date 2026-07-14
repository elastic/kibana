import type { Duration } from 'moment';
import { isDuration } from 'moment';
export type { Duration };
export { isDuration };
export declare function ensureDuration(value: Duration | string | number): Duration;
