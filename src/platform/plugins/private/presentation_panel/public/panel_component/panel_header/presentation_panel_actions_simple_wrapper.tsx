/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactElement } from 'react';
import { useBatchedOptionalPublishingSubjects } from '@kbn/presentation-publishing';
import { css } from '@emotion/react';
import { DefaultPresentationPanelApi } from '../types';
import { useHoverActionStyles } from './use_hover_actions_styles';

const actionsStyles = css({
  justifyContent: 'right',
  '.embPanel__hoverActionsAnchor &': {
    '&.embPanel__hoverActions': { visibility: 'visible !important' as 'visible' },
  },
});

export const PresentationPanelActionsSimpleWrapper = ({
  api,
  children,
  showBorder,
  overridenHoverActions,
}: {
  api: DefaultPresentationPanelApi | null;
  children: ReactElement;
  overridenHoverActions: ReactElement;
  showBorder?: boolean;
}) => {
  const [defaultTitle, title] = useBatchedOptionalPublishingSubjects(
    api?.defaultTitle$,
    api?.title$
  );

  const { containerStyles, hoverActionStyles } = useHoverActionStyles(true, showBorder);

  return (
    <div
      className="embPanel__hoverActionsAnchor"
      data-test-embeddable-id={api?.uuid}
      data-test-subj={`embeddablePanelHoverActions-${(title || defaultTitle || '').replace(
        /\s/g,
        ''
      )}`}
      css={containerStyles}
    >
      <div className="embPanel__hoverActions" css={[hoverActionStyles, actionsStyles]}>
        {overridenHoverActions}
      </div>
      {children}
    </div>
  );
};
