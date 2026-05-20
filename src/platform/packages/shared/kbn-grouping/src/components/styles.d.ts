import type { EuiThemeComputed } from '@elastic/eui';
export declare const groupingContainerCss: (euiTheme: EuiThemeComputed<{}>) => import("@emotion/react").SerializedStyles;
export declare const groupingContainerCssLevel: (euiTheme: EuiThemeComputed<{}>) => import("@emotion/react").SerializedStyles;
export declare const StyledContextMenu: import("styled-components").StyledComponent<import("react").ForwardRefExoticComponent<Omit<import("@elastic/eui").EuiContextMenuProps, "stylesMemoizer"> & import("react").RefAttributes<Omit<import("@elastic/eui").EuiContextMenuProps, "stylesMemoizer">>>, import("@kbn/react-kibana-context-styled/styled_provider").EuiTheme, {
    border: EuiThemeComputed["border"];
}, never>;
