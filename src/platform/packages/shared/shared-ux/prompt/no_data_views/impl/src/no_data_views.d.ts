import React from 'react';
import type { NoDataViewsPromptProps } from '@kbn/shared-ux-prompt-no-data-views-types';
/**
 * A service-enabled component that provides Kibana-specific functionality to the `NoDataViewsPrompt`
 * component.
 *
 * Use of this component requires both the `EuiTheme` context as well as a `NoDataViewsPrompt` provider.
 */
export declare const NoDataViewsPrompt: ({ onDataViewCreated, allowAdHocDataView, onTryESQL: onTryESQLProp, onESQLNavigationComplete, }: NoDataViewsPromptProps) => React.JSX.Element;
