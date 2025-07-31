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
import { PresentationPanelActionsSimpleWrapper } from './presentation_panel_actions_simple_wrapper';
import {
  PresentationPanelHoverActions,
  PresentationPanelHoverActionsProps,
} from './presentation_panel_hover_actions';

export const PresentationPanelHoverActionsWrapper = (props: PresentationPanelHoverActionsProps) => {
  const [overrideHoverActions] = useBatchedOptionalPublishingSubjects(
    props.api?.overrideHoverActions$
  );

  if (canOverrideHoverActions(props.api) && overrideHoverActions) {
    const CustomComponent = props.api?.OverriddenHoverActionsComponent;
    return (
      <PresentationPanelActionsSimpleWrapper
        {...props}
        overridenHoverActions={<CustomComponent />}
      />
    );
  }
  return <PresentationPanelHoverActions {...props} />;
};
