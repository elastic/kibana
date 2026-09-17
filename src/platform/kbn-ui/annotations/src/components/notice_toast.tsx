/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { css } from '@emotion/react';
import { EuiToast, useEuiTheme } from '@elastic/eui';
import type { AnnotationsNotice } from '../state/annotations_controller';
import { useAnnotations } from './annotations_context';
import { useLayerPortal, useLayerZIndex } from './hooks';

export const NoticeToast = ({ notice }: { notice: AnnotationsNotice }) => {
  const controller = useAnnotations();
  const { euiTheme } = useEuiTheme();
  const zIndex = useLayerZIndex();
  const container = useLayerPortal('kbnUiAnnotationsNotice', zIndex.panel);

  if (!container) {
    return null;
  }

  return createPortal(
    <div
      css={css`
        position: fixed;
        left: 50%;
        bottom: ${euiTheme.size.xxxl};
        transform: translateX(-50%);
        width: 420px;
        max-width: calc(100vw - ${euiTheme.size.xl});
        pointer-events: auto;
      `}
      data-test-subj="kbnUiAnnotationsNotice"
    >
      <EuiToast
        color={notice.type === 'success' ? 'success' : 'danger'}
        iconType={notice.type === 'success' ? 'check' : 'warning'}
        title={notice.message}
        onClose={() => controller.dismissNotice()}
      />
    </div>,
    container
  );
};
