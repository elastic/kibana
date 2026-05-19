import React from 'react';
/**
 * Absolutely-positioned overlay that fills its row so the tooltip triggers
 * anywhere on a disabled (at-max-limit) dimension option. The overlay has to
 * cover the option because EuiSelectable's row is focus-trapping and does not
 * surface its own tooltip slot.
 */
export declare const MaxDimensionsTooltipOverlay: () => React.JSX.Element;
