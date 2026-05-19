import React, { type ReactNode } from 'react';
import type { InternalChromeStart } from '@kbn/core-chrome-browser-internal-types';
interface ChromeContextValue {
    chrome: InternalChromeStart;
}
export interface ChromeServiceProviderProps {
    children: ReactNode;
    value: ChromeContextValue;
}
export declare function ChromeServiceProvider({ children, value }: ChromeServiceProviderProps): React.FunctionComponentElement<React.ProviderProps<ChromeContextValue | null>>;
export declare function useChromeService(): InternalChromeStart;
export {};
