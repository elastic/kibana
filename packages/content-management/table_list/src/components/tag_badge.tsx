/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';

import type { Tag } from '../types';
import { CtrlClickDetect } from './ctrl_click_detect';

export interface Props {
  tag: Tag;
  onClick: (tag: Tag, isCtrlKey: boolean) => void;
}

/**
 * The badge representation of a Tag, which is the default display to be used for them.
 */
export const TagBadge: FC<Props> = ({ tag, onClick }) => {
  const buttonCSS = css`
    cursor: pointer;
    &:hover {
      text-decoration: underline;
    }
  `;

  const badgeCSS = css`
    cursor: pointer;
    text-decoration: inherit;
  `;

  return (
    <CtrlClickDetect
      onClick={(e, { isCtrlKey }) => {
        onClick(tag, isCtrlKey);
      }}
    >
      {(ref, onClickWrapped) => (
        <button
          ref={ref}
          data-test-subj={`tag-${tag.id}`}
          onClick={onClickWrapped}
          aria-label={i18n.translate('contentManagement.tableList.tagBadge.buttonLabel', {
            defaultMessage: '{tagName} tag button.',
            values: {
              tagName: tag.name,
            },
          })}
          css={buttonCSS}
        >
          <EuiBadge color={tag.color} title={tag.description} css={badgeCSS}>
            {tag.name}
          </EuiBadge>
        </button>
      )}
    </CtrlClickDetect>
  );
};
