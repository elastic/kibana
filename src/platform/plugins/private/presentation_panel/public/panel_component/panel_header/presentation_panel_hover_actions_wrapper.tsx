/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import {
  canOverrideHoverActions,
  useBatchedOptionalPublishingSubjects,
} from '@kbn/presentation-publishing';
import { css } from '@emotion/react';
import classNames from 'classnames';
import type { PresentationPanelHoverActionsProps } from './presentation_panel_hover_actions';
import { PresentationPanelHoverActions } from './presentation_panel_hover_actions';
import { useHoverActionStyles } from './use_hover_actions_styles';

const customActionsStyles = css({
  justifyContent: 'right !important',
  '.embPanel__hoverActionsAnchor &': {
    '&.embPanel__hoverActions': {
      visibility: 'visible !important' as 'visible',
      '& > * ': {
        padding: 0, // overrides --paddingAroundAction because the custom component can define their own paddings
      },
    },
  },
});

export const PresentationPanelHoverActionsWrapper = (props: PresentationPanelHoverActionsProps) => {
  const [defaultTitle, title, hasLockedHoverActions, overrideHoverActions] =
    useBatchedOptionalPublishingSubjects(
      props.api?.defaultTitle$,
      props.api?.title$,
      props.api?.hasLockedHoverActions$,
      props.api?.overrideHoverActions$
    );
  const containerStyles = useHoverActionStyles(props.viewMode === 'edit', props.showBorder);

  let OverriddenHoverActionsComponent = null;
  if (canOverrideHoverActions(props.api) && overrideHoverActions) {
    OverriddenHoverActionsComponent = props.api?.OverriddenHoverActionsComponent;
  }

  return (
    <div
      className={classNames('embPanel__hoverActionsAnchor', {
        'embPanel__hoverActionsAnchor--lockHoverActions':
          hasLockedHoverActions || Boolean(OverriddenHoverActionsComponent),
        'embPanel__hoverActionsAnchor--editMode': props.viewMode === 'edit',
      })}
      data-test-embeddable-id={props.api?.uuid}
      data-test-subj={`embeddablePanelHoverActions-${(title || defaultTitle || '').replace(
        /\s/g,
        ''
      )}`}
      css={containerStyles}
    >
      {OverriddenHoverActionsComponent ? (
        <>
          <div className="embPanel__hoverActions" css={customActionsStyles}>
            <OverriddenHoverActionsComponent />
          </div>
          {props.children}
        </>
      ) : (
        <PresentationPanelHoverActions {...props} />
      )}
    </div>
  );
};
