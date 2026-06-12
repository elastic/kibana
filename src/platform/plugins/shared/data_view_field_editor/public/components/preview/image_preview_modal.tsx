/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ReactNode } from 'react';
import { css } from '@emotion/react';
import { EuiModal, EuiModalBody, type UseEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';

interface Props {
  imgElement: ReactNode;
  closeModal: () => void;
}

export const ImagePreviewModal = ({ imgElement, closeModal }: Props) => {
  const styles = useMemoCss(componentStyles);

  return (
    <EuiModal
      aria-label={i18n.translate('indexPatternFieldEditor.imagePreviewModal.ariaLabel', {
        defaultMessage: 'Image preview',
      })}
      onClose={closeModal}
    >
      <EuiModalBody>
        <div css={styles.previewImageModal}>{imgElement}</div>
      </EuiModalBody>
    </EuiModal>
  );
};

const componentStyles = {
  previewImageModal: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.base,

      '& img': {
        // `!important` is required to override the formatter's inline `max-width: none`
        // so the image stays constrained to the modal width.
        maxWidth: '100% !important',
      },
    }),
};
