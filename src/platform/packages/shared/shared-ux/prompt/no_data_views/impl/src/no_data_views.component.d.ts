import React from 'react';
import type { NoDataViewsPromptComponentProps } from '@kbn/shared-ux-prompt-no-data-views-types';
/**
 * A presentational component that is shown in cases when there are no data views created yet.
 */
export declare const NoDataViewsPrompt: ({ onClickCreate, canCreateNewDataView, dataViewsDocLink, onTryESQL, esqlDocLink, emptyPromptColor, }: NoDataViewsPromptComponentProps) => React.JSX.Element;
