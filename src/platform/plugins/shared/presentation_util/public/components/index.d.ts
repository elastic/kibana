import type { ComponentType, ReactElement } from 'react';
import React from 'react';
/**
 * A HOC which supplies React.Suspense with a fallback component, and a `EuiErrorBoundary` to contain errors.
 * @param Component A component deferred by `React.lazy`
 * @param fallback A fallback component to render while things load; default is `EuiLoadingSpinner`
 */
export declare const withSuspense: <P extends {}, R = {}>(Component: ComponentType<P>, fallback?: ReactElement | null) => React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<R>>;
export declare const LazyLabsBeakerButton: React.LazyExoticComponent<({ solutions, ...props }: import("./labs/labs_beaker_button").Props) => React.JSX.Element>;
export declare const LazyLabsFlyout: React.LazyExoticComponent<(props: import("./labs/labs_flyout").Props) => React.JSX.Element>;
export declare const LazyDashboardPicker: React.LazyExoticComponent<typeof import("./dashboard_picker/dashboard_picker").DashboardPicker>;
export declare const LazySavedObjectSaveModalDashboard: React.LazyExoticComponent<typeof import("./saved_object_save_modal_dashboard").default>;
/**
 * Used with `showSaveModal` to pass `SaveResult` back from `onSave`
 */
export declare const LazySavedObjectSaveModalDashboardWithSaveResult: React.LazyExoticComponent<(props: import("./types").SaveModalDashboardProps<import("../../../saved_objects/public").SaveResult>) => React.JSX.Element>;
export declare const LazyDataViewPicker: React.LazyExoticComponent<typeof import("./data_view_picker/data_view_picker").DataViewPicker>;
export declare const LazyFieldPicker: React.LazyExoticComponent<({ dataView, onSelectField, filterPredicate, selectedFieldName, selectableProps, ...other }: import("./field_picker/field_picker").FieldPickerProps) => React.JSX.Element>;
export type * from './types';
