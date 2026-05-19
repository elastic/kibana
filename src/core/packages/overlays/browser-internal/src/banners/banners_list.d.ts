import React from 'react';
import type { Observable } from 'rxjs';
import type { OverlayBanner } from './banners_service';
interface Props {
    banners$: Observable<OverlayBanner[]>;
}
/**
 * BannersList is a list of "banners". A banner something that is displayed at the top of Kibana that may or may not
 * disappear.
 *
 * Whether or not a banner can be closed is completely up to the author of the banner. Some banners make sense to be
 * static, such as banners meant to indicate the sensitivity (e.g., classification) of the information being
 * represented.
 */
export declare const BannersList: React.FunctionComponent<Props>;
export {};
