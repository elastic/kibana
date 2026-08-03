import React from 'react';
/**
 * A panel to demo how panels can be structured.
 * To see it, navigate to it from another panel with `navigateTo`
 *
 * @example
 * ```js
 * const { navigateTo } = useDateRangePickerPanelNavigation();
 * navigateTo(ExamplePanel.PANEL_ID);
 * ```
 */
export declare function ExamplePanel(): React.JSX.Element;
export declare namespace ExamplePanel {
    var PANEL_ID: string;
}
/**
 * A second example panel with dummy content, used to demo navigation history
 * (navigating forward and going back between panels).
 */
export declare function ExampleNestedPanel(): React.JSX.Element;
export declare namespace ExampleNestedPanel {
    var PANEL_ID: string;
}
