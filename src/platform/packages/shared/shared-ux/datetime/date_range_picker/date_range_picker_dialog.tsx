/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';

import { EuiPopover } from '@elastic/eui';

import { useDateRangePickerContext } from './date_range_picker_context';
import { DateRangePickerControl } from './date_range_picker_control';

/**
 * Dialog popover for the DateRangePicker.
 * Opens when the control enters editing mode.
 */
export function DateRangePickerDialog() {
  const { isEditing, maxWidth } = useDateRangePickerContext();
  const noop = () => {};

  return (
    <EuiPopover
      button={<DateRangePickerControl />}
      isOpen={isEditing}
      closePopover={noop}
      anchorPosition="downLeft"
      attachToAnchor={true}
      repositionToCrossAxis={false}
      display="block"
      css={css({ maxInlineSize: maxWidth })}
      ownFocus={false}
      panelPaddingSize="none"
    >
      {/* testing for now */}
      <div style={{ minWidth: maxWidth, minHeight: 500 }} />
    </EuiPopover>
  );
}
