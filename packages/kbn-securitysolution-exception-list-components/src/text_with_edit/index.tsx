/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import { EuiButtonIcon } from '@elastic/eui';
import { Interpolation, Theme } from '@emotion/react';
import { textWithEditContainerCss } from '../list_header/list_header.styles';

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
    <div css={textWithEditContainerCss}>
      <span css={textCss} data-test-subj={`${dataTestSubj || ''}Text`}>
        {text}
      </span>
      {isReadonly ? null : (
        <EuiButtonIcon
          data-test-subj={`${dataTestSubj || ''}EditIcon`}
          aria-label="Edit Text List Header"
          iconType="pencil"
          onClick={() => (typeof onEdit === 'function' ? onEdit() : null)}
        />
      )}
    </div>
  );
};
TextWithEditComponent.displayName = 'TextWithEditComponent';

export const TextWithEdit = React.memo(TextWithEditComponent);

TextWithEdit.displayName = 'TextWithEdit';
