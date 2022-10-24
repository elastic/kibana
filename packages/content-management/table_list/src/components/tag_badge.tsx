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
  return (
    <CtrlClickDetect
      onClick={(e, { isCtrlKey }) => {
        onClick(tag, isCtrlKey);
      }}
    >
      {(ref) => (
        <span ref={ref}>
          <EuiBadge
            color={tag.color}
            title={tag.description}
            {...{
              onClick: () => undefined,
              onClickAriaLabel: i18n.translate('contentManagement.tableList.tagBadge.buttonLabel', {
                defaultMessage: '{tagName} tag button.',
                values: {
                  tagName: tag.name,
                },
              }),
              iconOnClick: () => undefined,
              iconOnClickAriaLabel: '',
            }}
          >
            {tag.name}
          </EuiBadge>
        </span>
      )}
    </CtrlClickDetect>
  );
};
