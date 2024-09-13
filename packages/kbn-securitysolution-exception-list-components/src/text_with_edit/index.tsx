/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC } from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Interpolation, Theme } from '@emotion/react';
import { textWithEditContainerCss, editIconCss } from './text_with_edit.styles';
interface TextWithEditProps {
  isReadonly: boolean;
  dataTestSubj?: string;
  text: string;
  textCss?: Interpolation<Theme>;
  onEdit?: () => void;
}

const TextWithEditComponent: FC<TextWithEditProps> = ({
  isReadonly,
  dataTestSubj,
  text,
  onEdit,
  textCss,
}) => {
  return (
    <EuiFlexGroup css={textWithEditContainerCss}>
      <EuiFlexItem grow={10}>
        <span css={textCss} data-test-subj={`${dataTestSubj || ''}Text`}>
          {text}
        </span>
      </EuiFlexItem>
      <EuiFlexItem grow={false} css={editIconCss}>
        {isReadonly ? null : (
          <EuiButtonIcon
            data-test-subj={`${dataTestSubj || ''}EditIcon`}
            aria-label="Edit Text List Header"
            iconType="pencil"
            onClick={() => (typeof onEdit === 'function' ? onEdit() : null)}
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
TextWithEditComponent.displayName = 'TextWithEditComponent';

export const TextWithEdit = React.memo(TextWithEditComponent);

TextWithEdit.displayName = 'TextWithEdit';
