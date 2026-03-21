import React from 'react';
export type { DataViewPickerProps } from './data_view_picker';
/**
 * The Lazily-loaded `DataViewsList` component.  Consumers should use `React.Suspense` or
 * the withSuspense` HOC to load this component.
 */
export declare const DataViewsListLazy: React.LazyExoticComponent<typeof import("./dataview_list").DataViewsList>;
/**
 * A `DataViewsList` component that is wrapped by the `withSuspense` HOC. This component can
 * be used directly by consumers and will load the `DataViewsLazy` component lazily with
 * a predefined fallback and error boundary.
 */
export declare const DataViewsList: React.ForwardRefExoticComponent<import("./dataview_list").DataViewsListProps & import("@kbn/shared-ux-utility").WithSuspenseExtendedDeps & React.RefAttributes<{}>>;
/**
 * The Lazily-loaded `DataViewSelector` component.  Consumers should use `React.Suspense` or
 * the withSuspense` HOC to load this component.
 */
export declare const DataViewSelectorLazy: React.LazyExoticComponent<({ currentDataViewId, searchListInputId, dataViewsList, selectableProps, setPopoverIsOpen, onChangeDataView, onCreateDefaultAdHocDataView, }: import("./data_view_selector").DataViewSelectorProps) => React.JSX.Element>;
/**
 * A `DataViewSelector` component that is wrapped by the `withSuspense` HOC. This component can
 * be used directly by consumers and will load the `DataViewSelectorLazy` component lazily with
 * a predefined fallback and error boundary.
 */
export declare const DataViewSelector: React.ForwardRefExoticComponent<import("./data_view_selector").DataViewSelectorProps & import("@kbn/shared-ux-utility").WithSuspenseExtendedDeps & React.RefAttributes<{}>>;
/**
 * The Lazily-loaded `DataViewPicker` component.  Consumers should use `React.Suspense` or
 * the withSuspense` HOC to load this component.
 */
export declare const DataViewPickerLazy: React.LazyExoticComponent<({ isMissingCurrent, currentDataViewId, adHocDataViews, savedDataViews, onChangeDataView, onEditDataView, onAddField, onDataViewCreated, onClosePopover, trigger, selectableProps, onCreateDefaultAdHocDataView, isDisabled, getDataViewHelpText, }: import("./data_view_picker").DataViewPickerProps) => React.JSX.Element>;
/**
 * A `DataViewPicker` component that is wrapped by the `withSuspense` HOC. This component can
 * be used directly by consumers and will load the `DataViewPickerLazy` component lazily with
 * a predefined fallback and error boundary.
 */
export declare const DataViewPicker: React.ForwardRefExoticComponent<import("./data_view_picker").DataViewPickerProps & import("@kbn/shared-ux-utility").WithSuspenseExtendedDeps & React.RefAttributes<{}>>;
