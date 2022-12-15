/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import {CmAvatarUi, type CmAvatarUiProps} from './avatar_ui';
import {useContentItem} from '../../context';
import {CmAvatarEmpty} from './avatar_empty';

/**
 * Props of {@link CmAvatar} component.
 */
export interface CmAvatarProps extends Omit<CmAvatarUiProps, 'title'> {
  id: string;
}

/**
 * A connected "container" component of "avatar" view for a single content item.
 * 
 * Renders any content item as an "avatar" - a small circle or a square with
 * with text initials or an image.
 */
export const CmAvatar: React.FC<CmAvatarProps> = (props) => {
  const { id, ...rest } = props;
  const { data } = useContentItem(id);

  if (!data) {
    return (
      <CmAvatarEmpty
        size={props.size}
        disabled={props.disabled}
      />
    )
  }

  const title = data.fields.title || '';

  return (
    <CmAvatarUi
      {...rest}
      title={title}
    />
  );
};
