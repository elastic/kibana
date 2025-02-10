/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { FunctionComponent } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { EuiLink } from '@elastic/eui';
import { css } from '@emotion/react';
import { useBehaviorSubject } from '@kbn/shared-ux-file-util';
import { useFilePickerContext } from '../context';

import { i18nTexts } from '../i18n_texts';

interface Props {
  onClick: () => void;
}

export const ClearFilterButton: FunctionComponent<Props> = ({ onClick }) => {
  const { state } = useFilePickerContext();
  const isUploading = useBehaviorSubject(state.isUploading$);
  const query = useObservable(state.queryDebounced$);
  if (!query) {
    return null;
  }
  return (
    <div
      css={css`
        display: grid;
        place-items: center;
      `}
    >
      <EuiLink disabled={isUploading} onClick={onClick}>
        {i18nTexts.clearFilterButton}
      </EuiLink>
    </div>
  );
};
