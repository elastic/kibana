/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type PropsWithChildren } from 'react';

import {
  canOverrideHoverActions,
  getSelectionApi,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { css } from '@emotion/react';
import classNames from 'classnames';
import { BehaviorSubject } from 'rxjs';
import type {
  PanelSelection,
  PresentationPanelHoverActionsProps,
} from './presentation_panel_hover_actions';
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

export const PresentationPanelHoverActionsWrapper = (
  props: PropsWithChildren<PresentationPanelHoverActionsProps>
) => {
  const selectionApi = getSelectionApi(props.api);
  const [defaultTitle, title, hasLockedHoverActions, overrideHoverActions, selectedPanelIds] =
    useBatchedPublishingSubjects(
      props.api.defaultTitle$ ?? new BehaviorSubject(undefined),
      props.api.title$ ?? new BehaviorSubject(undefined),
      props.api.hasLockedHoverActions$ ?? new BehaviorSubject(false),
      props.api.overrideHoverActions$ ?? new BehaviorSubject(false),
      selectionApi?.selectedPanelIds$ ?? new BehaviorSubject<string[]>([])
    );
  const containerStyles = useHoverActionStyles(props.viewMode === 'edit', props.showBorder);
  const panelId = props.api?.uuid;
  const selection: PanelSelection | undefined =
    selectionApi && panelId && props.viewMode === 'edit'
      ? {
          isSelectionMode: selectedPanelIds.length > 0,
          isSelected: selectedPanelIds.includes(panelId),
          toggle: () => selectionApi.togglePanelSelection(panelId),
        }
      : undefined;

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
        'embPanel__hoverActionsAnchor--selectionMode': Boolean(selection?.isSelectionMode),
      })}
      data-test-embeddable-id={props.api?.uuid}
      data-test-subj={`embeddablePanelHoverActions-${(title || defaultTitle || '').replace(
        /\s/g,
        ''
      )}`}
      css={containerStyles}
    >
      {OverriddenHoverActionsComponent && (
        <div className="embPanel__hoverActions" css={customActionsStyles}>
          <OverriddenHoverActionsComponent />
        </div>
      )}
      {props.children}
      {!OverriddenHoverActionsComponent && (
        <PresentationPanelHoverActions {...props} selection={selection} />
      )}
    </div>
  );
};
