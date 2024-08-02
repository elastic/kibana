/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './filter_button_group.scss';

import React, { FC, ReactNode } from 'react';
import classNames from 'classnames';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

interface Props {
  items: ReactNode[];
  /**
   * Displays the last item without a border radius as if attached to the next DOM node
   */
  attached?: boolean;
}

export const FilterButtonGroup: FC<Props> = ({ items, attached, ...rest }: Props) => {
  return (
    <EuiFlexGroup
      className={classNames('kbnFilterButtonGroup', {
        'kbnFilterButtonGroup--attached': attached
      })}
      gutterSize="none"
      responsive={false}
      {...rest}
    >
      {items.map((item, i) =>
        item == null ? undefined : (
          <EuiFlexItem key={i} grow={false}>
            {item}
          </EuiFlexItem>
        )
      )}
    </EuiFlexGroup>
  );
};
