/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__/data_view';
import { FieldBadgeWithActions } from './cell_actions_popover';

describe('FieldBadgeWithActions', () => {
  it('should use the field display name in the popover title and copy action', async () => {
    render(
      <FieldBadgeWithActions
        name="bytes"
        property={dataViewMock.getFieldByName('bytes')}
        rawValue={1024}
        formattedValue="1,024"
        textValue="1,024"
      />
    );

    await userEvent.click(screen.getByTestId('dataTableCellActionsPopover_bytes'));

    expect(screen.getByTestId('dataTableCellActionPopoverTitle')).toHaveTextContent(
      'bytesDisplayName 1024'
    );
    expect(
      screen.getByTestId('dataTableCellAction_copyToClipboardAction_bytes')
    ).toHaveAccessibleName('Copy value of bytesDisplayName');
  });
});
