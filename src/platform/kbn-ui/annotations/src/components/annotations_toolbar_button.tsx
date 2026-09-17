/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type MouseEvent } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAnnotations, useAnnotationsState } from './annotations_context';

export const ANNOTATIONS_BUTTON_TEST_SUBJ = 'kbnUiAnnotationsButton';

const preventFocusChange = (event: MouseEvent) => {
  event.preventDefault();
};

export const AnnotationsToolbarButton = () => {
  const controller = useAnnotations();
  const active = useAnnotationsState((state) => state.active);
  const label = active
    ? i18n.translate('kbnUI.annotations.button.exit', { defaultMessage: 'Exit comment mode' })
    : i18n.translate('kbnUI.annotations.button.enter', { defaultMessage: 'Comment mode' });
  return (
    <EuiToolTip content={label} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="comment"
        aria-label={label}
        aria-pressed={active}
        color={active ? 'primary' : 'text'}
        display={active ? 'fill' : 'empty'}
        onClick={() => controller.toggleActive()}
        onMouseDown={preventFocusChange}
        data-test-subj={ANNOTATIONS_BUTTON_TEST_SUBJ}
      />
    </EuiToolTip>
  );
};
