/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

interface ExtraActionsButtonProps {
  onClick: () => void;
  showTooltip: boolean;
}

export const SHOW_MORE_ACTIONS = i18n.translate(
  'xpack.securitySolution.cellActions.showMoreActionsLabel',
  {
    defaultMessage: 'More actions',
  }
);

export const ExtraActionsButton: React.FC<ExtraActionsButtonProps> = ({ onClick, showTooltip }) =>
  showTooltip ? (
    <EuiToolTip content={SHOW_MORE_ACTIONS}>
      <EuiButtonIcon aria-label={SHOW_MORE_ACTIONS} iconType="boxesHorizontal" onClick={onClick} />
    </EuiToolTip>
  ) : (
    <EuiButtonIcon aria-label={SHOW_MORE_ACTIONS} iconType="boxesHorizontal" onClick={onClick} />
  );

ExtraActionsButton.displayName = 'ExtraActionsButton';
