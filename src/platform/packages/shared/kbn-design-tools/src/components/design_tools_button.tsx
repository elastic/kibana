/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense, lazy, useState } from 'react';
import type { MouseEvent } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const LazyDesignToolsButtonImpl = lazy(() =>
  import('./design_tools_button_impl').then(({ DesignToolsButtonImpl }) => ({
    default: DesignToolsButtonImpl,
  }))
);

/**
 * Thin shell that renders only a button icon until the user clicks it.
 * The full implementation (overlays, context menu, flyout, edit mode)
 * is lazy-loaded on first interaction to keep the initial bundle small.
 *
 * @returns A toolbar button that lazy-loads the design tools on first click.
 */
export const DesignToolsButton = () => {
  const [activated, setActivated] = useState(false);

  const preventTargetFromLosingFocus = (event: MouseEvent) => {
    event.preventDefault();
  };

  if (activated) {
    return (
      <Suspense fallback={null}>
        <LazyDesignToolsButtonImpl initiallyOpen />
      </Suspense>
    );
  }

  return (
    <EuiToolTip
      content={i18n.translate('kbnDesignTools.layout.button.tooltip', {
        defaultMessage: 'Design tools',
      })}
    >
      <EuiButtonIcon
        onClick={() => setActivated(true)}
        onMouseDown={preventTargetFromLosingFocus}
        iconType="vectorSquare"
        aria-label={i18n.translate('kbnDesignTools.layout.button.ariaLabel', {
          defaultMessage: 'Design tools',
        })}
        color="text"
        data-test-subj="designToolsButton"
      />
    </EuiToolTip>
  );
};
