/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiScreenReaderOnly, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import useUnmount from 'react-use/lib/useUnmount';

export const useFlyoutA11y = ({ isXlScreen }: { isXlScreen: boolean }) => {
  const descriptionId = useGeneratedHtmlId();
  const [triggerEl] = useState(document.activeElement);
  const [flyoutEl, setFlyoutEl] = useState<HTMLElement | null>(null);

  // Auto-focus push flyout on open or when switching to XL screen
  useEffect(() => {
    if (isXlScreen && flyoutEl && document.contains(flyoutEl)) {
      // Wait a tick before focusing or focus will be stolen by the trigger element when
      // switching from an overlay flyout to a push flyout (due to EUI focus lock)
      setTimeout(() => flyoutEl.focus());
    }
  }, [flyoutEl, isXlScreen]);

  // Return focus to the trigger element when the flyout is closed
  useUnmount(() => {
    if (triggerEl instanceof HTMLElement && document.contains(triggerEl)) {
      triggerEl.focus();
    }
  });

  return {
    a11yProps: {
      ref: setFlyoutEl,
      role: isXlScreen ? 'dialog' : undefined,
      tabIndex: isXlScreen ? 0 : undefined,
      'aria-describedby': isXlScreen ? descriptionId : undefined,
      'data-no-focus-lock': isXlScreen || undefined,
    },
    screenReaderDescription: isXlScreen && (
      <EuiScreenReaderOnly>
        <p id={descriptionId} data-test-subj="unifiedDocViewerScreenReaderDescription">
          {i18n.translate('unifiedDocViewer.flyout.screenReaderDescription', {
            defaultMessage: 'You are in a non-modal dialog. To close the dialog, press Escape.',
          })}
        </p>
      </EuiScreenReaderOnly>
    ),
  };
};
