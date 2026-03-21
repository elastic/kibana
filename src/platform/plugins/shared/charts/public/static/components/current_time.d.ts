import type { Moment } from 'moment';
import type { FC } from 'react';
interface CurrentTimeProps {
    isDarkMode: boolean;
    domainEnd?: number | Moment;
}
/**
 * Render current time line annotation on @elastic/charts `Chart`
 */
export declare const CurrentTime: FC<CurrentTimeProps>;
export {};
