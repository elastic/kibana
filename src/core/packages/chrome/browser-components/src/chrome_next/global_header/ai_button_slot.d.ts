import React from 'react';
/**
 * Renders the AI button(s) registered via `chrome.next.aiButton.register`.
 *
 * Stop-gap for the Chrome-Next transition: ideally there is a single chrome-owned AI
 * button, but the legacy header lets each solution register its own and manage its own
 * visibility. Until that consolidates we render every registration as-is and let each
 * owner decide whether it shows anything. Once the single-button model lands this should
 * render at most one button.
 *
 * Tech debt: https://github.com/elastic/kibana/issues/272279
 */
export declare const AiButtonSlot: React.MemoExoticComponent<() => React.JSX.Element | null>;
