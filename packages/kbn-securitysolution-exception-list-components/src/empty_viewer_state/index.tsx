/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import type { FC } from 'react';
import { css } from '@emotion/react';
import {
  EuiLoadingContent,
  EuiImage,
  EuiEmptyPrompt,
  EuiButton,
  useEuiTheme,
  EuiPanel,
} from '@elastic/eui';
import type { ExpressionColor } from '@elastic/eui/src/components/expression/expression';
import type { EuiFacetGroupLayout } from '@elastic/eui/src/components/facet/facet_group';
import { euiThemeVars } from '@kbn/ui-theme';
import { ListTypeText, ViewerStatus } from '../types';
import * as i18n from '../translations';
import illustration from '../assets/images/illustration_product_no_results_magnifying_glass.svg';

interface EmptyViewerStateProps {
  title?: string;
  body?: string;
  buttonText?: string;
  listType?: ListTypeText;
  isReadOnly: boolean;
  viewerStatus: ViewerStatus;
  onCreateExceptionListItem?: () => void | null;
}

const panelCss = css`
  margin: ${euiThemeVars.euiSizeL} 0;
  padding: ${euiThemeVars.euiSizeL} 0;
`;
const EmptyViewerStateComponent: FC<EmptyViewerStateProps> = ({
  title,
  body,
  buttonText,
  listType,
  isReadOnly,
  viewerStatus,
  onCreateExceptionListItem,
}) => {
  const { euiTheme } = useEuiTheme();

  const euiEmptyPromptProps = useMemo(() => {
    switch (viewerStatus) {
      case ViewerStatus.ERROR: {
        return {
          color: 'danger' as ExpressionColor,
          iconType: 'alert',
          title: (
            <h2 data-test-subj="errorTitle">{title || i18n.EMPTY_VIEWER_STATE_ERROR_TITLE}</h2>
          ),
          body: <p data-test-subj="errorBody">{body || i18n.EMPTY_VIEWER_STATE_ERROR_BODY}</p>,
          'data-test-subj': 'errorViewerState',
        };
      }
      case ViewerStatus.EMPTY:
        return {
          color: 'subdued' as ExpressionColor,
          iconType: 'plusInCircle',
          iconColor: euiTheme.colors.darkestShade,
          title: (
            <h2 data-test-subj="emptyTitle">{title || i18n.EMPTY_VIEWER_STATE_EMPTY_TITLE}</h2>
          ),
          body: <p data-test-subj="emptyBody">{body || i18n.EMPTY_VIEWER_STATE_EMPTY_BODY}</p>,
          'data-test-subj': 'emptyViewerState',
          actions: [
            <EuiButton
              data-test-subj="emptyStateButton"
              onClick={onCreateExceptionListItem}
              iconType="plusInCircle"
              color="primary"
              isDisabled={isReadOnly}
              fill
            >
              {buttonText || i18n.EMPTY_VIEWER_STATE_EMPTY_VIEWER_BUTTON(listType || 'rule')}
            </EuiButton>,
          ],
        };
      case ViewerStatus.EMPTY_SEARCH:
        return {
          color: 'plain' as ExpressionColor,
          layout: 'horizontal' as EuiFacetGroupLayout,
          hasBorder: true,
          hasShadow: false,
          icon: <EuiImage size="fullWidth" alt="" src={illustration} />,
          title: (
            <h3 data-test-subj="emptySearchTitle">
              {title || i18n.EMPTY_VIEWER_STATE_EMPTY_SEARCH_TITLE}
            </h3>
          ),
          body: (
            <p data-test-subj="emptySearchBody">
              {body || i18n.EMPTY_VIEWER_STATE_EMPTY_SEARCH_BODY}
            </p>
          ),
          'data-test-subj': 'emptySearchViewerState',
        };
    }
  }, [
    viewerStatus,
    euiTheme.colors.darkestShade,
    title,
    body,
    onCreateExceptionListItem,
    isReadOnly,
    buttonText,
    listType,
  ]);

  if (viewerStatus === ViewerStatus.LOADING || viewerStatus === ViewerStatus.SEARCHING)
    return <EuiLoadingContent lines={4} data-test-subj="loadingViewerState" />;

  return (
    <EuiPanel css={panelCss} color={viewerStatus === 'empty_search' ? 'subdued' : 'transparent'}>
      <EuiEmptyPrompt {...euiEmptyPromptProps} />
    </EuiPanel>
  );
};

export const EmptyViewerState = React.memo(EmptyViewerStateComponent);

EmptyViewerState.displayName = 'EmptyViewerState';
