import type { CoreStart } from '@kbn/core-lifecycle-browser';
import * as conn from '..';
export interface OpenConnectionDetailsParams {
    props: conn.KibanaConnectionDetailsProviderProps;
    start: {
        core: {
            overlays: CoreStart['overlays'];
            i18n: CoreStart['i18n'];
            analytics?: CoreStart['analytics'];
            theme: CoreStart['theme'];
            userProfile: CoreStart['userProfile'];
        };
    };
}
export declare const openConnectionDetails: ({ props, start }: OpenConnectionDetailsParams) => Promise<import("@kbn/core/public").OverlayRef>;
