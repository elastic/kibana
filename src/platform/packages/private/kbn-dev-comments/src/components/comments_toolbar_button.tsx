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
import { IGNORE_ATTR } from '../constants';
import { useComments, useCommentsState } from './comments_context';

export const COMMENTS_BUTTON_TEST_SUBJ = 'devCommentsButton';

// The button is layer UI like the portals are: in comment mode, clicks on anything
// else are swallowed before they act, so a host that does not list the button in
// `ignoreSelectors` could switch comment mode on with it but never off.
const ignoreProps = { [IGNORE_ATTR]: true } as Record<string, unknown>;

const preventFocusChange = (event: MouseEvent) => {
  event.preventDefault();
};

export const CommentsToolbarButton = () => {
  const controller = useComments();
  const active = useCommentsState((state) => state.active);
  const label = active
    ? i18n.translate('devComments.button.exit', { defaultMessage: 'Exit comment mode' })
    : i18n.translate('devComments.button.enter', { defaultMessage: 'Comment mode' });
  return (
    <EuiToolTip content={label} disableScreenReaderOutput anchorProps={ignoreProps}>
      <EuiButtonIcon
        iconType="comment"
        aria-label={label}
        aria-pressed={active}
        color={active ? 'primary' : 'text'}
        display={active ? 'fill' : 'empty'}
        onClick={() => controller.toggleActive()}
        onMouseDown={preventFocusChange}
        data-test-subj={COMMENTS_BUTTON_TEST_SUBJ}
      />
    </EuiToolTip>
  );
};
