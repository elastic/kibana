/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export type ResizerMouseEvent = React.MouseEvent<HTMLButtonElement, MouseEvent>;
export type ResizerKeyDownEvent = React.KeyboardEvent<HTMLButtonElement>;

export interface Props {
  onKeyDown: (eve: ResizerKeyDownEvent) => void;
  onMouseDown: (eve: ResizerMouseEvent) => void;
  className?: string;
}

export function Resizer(props: Props) {
  return (
    <button
      {...props}
      data-test-subj="splitPanelResizer"
      aria-label={i18n.translate('kibana-react.splitPanel.adjustPanelSizeAriaLabel', {
        defaultMessage: 'Press left/right to adjust panels size',
      })}
    >
      <EuiIcon type="grabHorizontal" />
    </button>
  );
}
