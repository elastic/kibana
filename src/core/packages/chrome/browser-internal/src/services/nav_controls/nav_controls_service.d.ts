import type { ChromeNavControls } from '@kbn/core-chrome-browser';
/** @internal */
export declare class NavControlsService {
    private readonly stop$;
    start(): ChromeNavControls;
    stop(): void;
}
