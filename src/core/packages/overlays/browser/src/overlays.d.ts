import type { OverlayBannersStart } from './banners';
import type { OverlayFlyoutStart } from './flyout';
import type { OverlayModalStart } from './modal';
import type { OverlaySystemFlyoutStart } from './system_flyout';
/** @public */
export interface OverlayStart {
    /** {@link OverlayBannersStart} */
    banners: OverlayBannersStart;
    /** {@link OverlayFlyoutStart#open} */
    openFlyout: OverlayFlyoutStart['open'];
    /** Opens a system flyout that integrates with EUI Flyout Manager */
    openSystemFlyout: OverlaySystemFlyoutStart['open'];
    /** {@link OverlayModalStart#open} */
    openModal: OverlayModalStart['open'];
    /** {@link OverlayModalStart#openConfirm} */
    openConfirm: OverlayModalStart['openConfirm'];
}
