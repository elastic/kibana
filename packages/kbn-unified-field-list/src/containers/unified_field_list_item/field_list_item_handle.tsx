/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiIcon } from '@elastic/eui';
import { css } from '@emotion/react';
import dragHandleIcon from './drag_handle_icon.svg';

/**
 * A temporary icon for the field list drag handle
 * @constructor
 */
export const FieldListItemHandle: React.FC = () => {
  return (
    <div
      css={css`
        transform: translateY(-1px);
        pointer-events: none;
      `}
    >
      {/* TODO: replace with a new Eui icon type once it's available and remove svg file */}
      <EuiIcon type={dragHandleIcon} size="original" />
    </div>
  );
};
