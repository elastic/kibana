import type { FC } from 'react';
import type { DomainRange } from '@elastic/charts';
interface XYCurrentTime {
    enabled: boolean;
    isDarkMode: boolean;
    domain?: DomainRange;
}
export declare const XYCurrentTime: FC<XYCurrentTime>;
export {};
