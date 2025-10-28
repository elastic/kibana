/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiBadgeGroup, EuiPopover, EuiPopoverTitle } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useState } from 'react';
import * as i18n from '../../../common/translations';

interface WorkflowTagsProps {
  tags: string[] | undefined;
}

export const WorkflowTags = ({ tags }: WorkflowTagsProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  if (!tags || tags.length === 0) return null;

  const [firstTag, secondTag, ...restOfTags] = tags;

  return (
    <EuiBadgeGroup
      gutterSize="xs"
      css={css`
        max-width: 80%;
        flex-wrap: nowrap;
      `}
    >
      <EuiBadge
        key={firstTag}
        color="hollow"
        css={css`
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
        `}
      >
        {firstTag}
      </EuiBadge>
      {secondTag && (
        <EuiBadge
          key={secondTag}
          color="hollow"
          css={css`
            max-width: 150px;
            overflow: hidden;
            text-overflow: ellipsis;
          `}
        >
          {secondTag}
        </EuiBadge>
      )}
      {restOfTags.length > 0 && (
        <EuiPopover
          ownFocus
          css={css`
            display: inline-flex;
            align-items: center;
          `}
          button={
            <EuiBadge
              color="hollow"
              onClick={() => setIsPopoverOpen(!isPopoverOpen)}
              onClickAriaLabel={i18n.TAGS_LIST_TITLE}
            >
              {`+${restOfTags.length.toString()}`}
            </EuiBadge>
          }
          isOpen={isPopoverOpen}
          closePopover={() => setIsPopoverOpen(false)}
          repositionOnScroll
        >
          <EuiPopoverTitle>{i18n.TAGS_LIST_TITLE}</EuiPopoverTitle>
          <EuiBadgeGroup
            gutterSize="xs"
            css={css`
              max-height: 200px;
              max-width: 600px;
              overflow: auto;
            `}
          >
            {tags.map((tag) => (
              <EuiBadge key={tag} color="hollow">
                {tag}
              </EuiBadge>
            ))}
          </EuiBadgeGroup>
        </EuiPopover>
      )}
    </EuiBadgeGroup>
  );
};
