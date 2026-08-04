import type { FC } from 'react';
import type { GaugeRenderProps } from '../../common';
declare global {
    interface Window {
        /**
         * Flag used to enable debugState on elastic charts
         */
        _echDebugStateFlag?: boolean;
    }
}
export declare const GaugeComponent: FC<GaugeRenderProps>;
export { GaugeComponent as default };
