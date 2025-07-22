/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import classNames from 'classnames';
import React, { ReactElement } from 'react';

import { useBatchedOptionalPublishingSubjects, ViewMode } from '@kbn/presentation-publishing';

import { css } from '@emotion/react';
import { DefaultPresentationPanelApi } from '../types';
import { useHoverActionStyles } from './use_hover_actions_styles';

export const PresentationPanelEditActions = ({
  api,
  children,
  viewMode,
  showBorder,
  overridenHoverActions,
}: {
  api: DefaultPresentationPanelApi | null;
  children: ReactElement;
  overridenHoverActions: ReactElement;
  viewMode?: ViewMode;
  showBorder?: boolean;
}) => {
  console.log('PresentationPanelEditActions');
  const [defaultTitle, title] = useBatchedOptionalPublishingSubjects(
    api?.defaultTitle$,
    api?.title$
  );

  const { containerStyles, hoverActionStyles } = useHoverActionStyles(
    viewMode === 'edit',
    showBorder
  );

  return (
    <div
      className={classNames('embPanel__hoverActionsAnchor', 'what', {
        'embPanel__hoverActionsAnchor--lockHoverActions': true,
        'embPanel__hoverActionsAnchor--editMode': true,
      })}
      data-test-embeddable-id={api?.uuid}
      data-test-subj={`embeddablePanelHoverActions-${(title || defaultTitle || '').replace(
        /\s/g,
        ''
      )}`}
      css={containerStyles}
    >
         <div
        className={classNames('embPanel__hoverActions')}
        css={[
          hoverActionStyles,
          css({
            '.embPanel__hoverActionsAnchor &': {
              '&.embPanel__hoverActions': { visibility: 'visible !important' as 'visible' },
            },
          }),
        ]}
      >
        {overridenHoverActions}
      </div>
      {children}
   
    </div>
  );
};
