import type { ChromeExtensionContent } from '@kbn/core-mount-utils-browser';
/**
 * A single AI button registration for the Chrome-Next global header.
 *
 * `content` is rendered as-is, so the registering owner fully controls the button UI
 * and its visibility. This is intentionally minimal for the transition period: see
 * `ChromeNext['aiButton'].register` for why multiple registrations are allowed today.
 *
 * Tech debt: https://github.com/elastic/kibana/issues/272279
 *
 * @public
 */
export interface GlobalHeaderAiButton {
    content: ChromeExtensionContent;
}
