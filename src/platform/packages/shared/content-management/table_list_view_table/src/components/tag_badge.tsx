/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC } from 'react';
import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isMac } from '@kbn/shared-ux-utility';

import type { Tag } from '../types';
export interface Props {
  tag: Tag;
  onClick: (tag: Tag, withModifierKey: boolean) => void;
}

/**
 * The badge representation of a Tag, which is the default display to be used for them.
 */
export const TagBadge: FC<Props> = ({ tag, onClick }) => {
  return (
    <EuiBadge
      color={tag.color}
      title={tag.description}
      data-test-subj={`tag-${tag.id}`}
      onClick={(e) => {
        const withModifierKey = (isMac && e.metaKey) || (!isMac && e.ctrlKey);
        onClick(tag, withModifierKey);
      }}
      onClickAriaLabel={i18n.translate('contentManagement.tableList.tagBadge.buttonLabel', {
        defaultMessage: '{tagName} tag',
        values: {
          tagName: tag.name,
        },
      })}
    >
      {tag.name}
    </EuiBadge>
  );
};
