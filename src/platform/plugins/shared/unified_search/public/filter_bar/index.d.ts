import React from 'react';
export type { FilterItemsProps } from './filter_item/filter_items';
declare const LazyFilterBar: React.LazyExoticComponent<React.FC<import("react-intl").WithIntlProps<Omit<import("./filter_bar").Props, "kibana">>> & {
    WrappedComponent: React.ComponentType<Omit<import("./filter_bar").Props, "kibana">>;
}>;
export declare const FilterBar: (props: React.ComponentProps<typeof LazyFilterBar>) => React.JSX.Element;
declare const LazyFilterItems: React.LazyExoticComponent<React.FC<import("react-intl").WithIntlProps<import("./filter_item/filter_items").FilterItemsProps>> & {
    WrappedComponent: React.ComponentType<import("./filter_item/filter_items").FilterItemsProps>;
}>;
/**
 * Renders a group of filter pills
 */
export declare const FilterItems: (props: React.ComponentProps<typeof LazyFilterItems>) => React.JSX.Element;
declare const LazyFilterItem: React.LazyExoticComponent<(props: Omit<import("./filter_item/filter_item").FilterItemProps, keyof import("./filter_editor").WithCloseFilterEditorConfirmModalProps>) => React.JSX.Element>;
/**
 * Renders a single filter pill
 */
export declare const FilterItem: (props: React.ComponentProps<typeof LazyFilterItem>) => React.JSX.Element;
