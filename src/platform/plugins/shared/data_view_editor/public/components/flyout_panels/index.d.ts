export declare const FlyoutPanels: {
    Group: import("react").FC<import("react").PropsWithChildren<import("./flyout_panels").Props>>;
    Item: import("react").FC<import("./flyout_panel").Props & import("react").HTMLProps<HTMLDivElement>>;
    Content: import("react").FC<{
        children?: import("react").ReactNode | undefined;
    }>;
    Header: import("react").FunctionComponent<{
        children: React.ReactNode;
    } & Omit<import("@elastic/eui/src/components/flyout/flyout_header").EuiFlyoutHeaderProps, "children">>;
    Footer: import("react").FC<{
        children: React.ReactNode;
    } & Omit<import("@elastic/eui/src/components/flyout/flyout_footer").EuiFlyoutFooterProps, "children">>;
};
