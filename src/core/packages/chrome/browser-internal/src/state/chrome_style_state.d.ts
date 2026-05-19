import type { Observable } from 'rxjs';
import type { ChromeStyle } from '@kbn/core-chrome-browser';
import { type State } from './state_helpers';
export interface ChromeStyleState {
    chromeStyle: State<ChromeStyle>;
    chromeStyle$: Observable<ChromeStyle>;
    setChromeStyle: (style: ChromeStyle) => void;
}
export declare const createChromeStyleState: () => ChromeStyleState;
