/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiCheckbox, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

const selectPanelLabel = i18n.translate('embeddableApi.selectPanel', {
  defaultMessage: 'Select panel',
});

const deselectPanelLabel = i18n.translate('embeddableApi.deselectPanel', {
  defaultMessage: 'Deselect panel',
});

// round variant of the EUI checkbox: only the shape changes, colors, check icon and focus
// ring stay EUI's. EUI exposes no shape prop, so the faux control is targeted directly.
const roundCheckboxStyles = css`
  .euiCheckboxControl {
    border-radius: 50%;
  }
`;

/**
 * Checkbox shown on every panel in selection mode. It lives in the panel's top right corner (see
 * `.embPanel__selectPanel` styles) rather than in the floating hover bar, which is gone in that mode.
 */
export const PanelSelectCheckbox = ({
  panelId,
  isSelected,
  onToggle,
}: {
  panelId: string;
  isSelected: boolean;
  onToggle: () => void;
}) => {
  const label = isSelected ? deselectPanelLabel : selectPanelLabel;
  return (
    <div className="embPanel__selectPanel" data-test-subj="embeddablePanelSelectPanel">
      <EuiToolTip content={label} disableScreenReaderOutput>
        <EuiCheckbox
          id={`embeddablePanelSelect-${panelId}`}
          className="embPanel--selectPanel"
          css={roundCheckboxStyles}
          checked={isSelected}
          aria-label={label}
          data-test-subj="embeddablePanelSelectToggle"
          onChange={onToggle}
        />
      </EuiToolTip>
    </div>
  );
};
