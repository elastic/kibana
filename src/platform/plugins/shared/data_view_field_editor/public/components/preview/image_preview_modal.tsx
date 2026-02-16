/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiModal, EuiModalBody, type UseEuiTheme } from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';

interface Props {
  imgHTML: React.ReactNode;
  closeModal: () => void;
}

export const ImagePreviewModal = ({ imgHTML, closeModal }: Props) => {
  const styles = useMemoCss(componentStyles);

  return (
    <EuiModal onClose={closeModal}>
      <EuiModalBody>
        <div css={styles.previewImageModal}>{imgHTML}</div>
      </EuiModalBody>
    </EuiModal>
  );
};

const componentStyles = {
  previewImageModal: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.base,

      '& img': {
        maxWidth: '100%',
      },
    }),
};
