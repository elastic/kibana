/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiPopover, EuiTitle, EuiHorizontalRule } from '@elastic/eui';

interface ShortcutsPopoverProps {
  button: any;
  isOpen: boolean;
  closePopover: () => void;
}

export const ShortcutsPopover = ({ button, isOpen, closePopover }: ShortcutsPopoverProps) => {
  return (
    <EuiPopover button={button} isOpen={isOpen} closePopover={closePopover}>
      <EuiTitle size="xs">
        <h4>Navigation shortcuts</h4>
      </EuiTitle>
      <EuiHorizontalRule />
      <EuiTitle size="xs">
        <h4>Request shortcuts</h4>
      </EuiTitle>
      <EuiHorizontalRule />
      <EuiTitle size="xs">
        <h4>Autocomplete menu shortcuts</h4>
      </EuiTitle>
      <EuiHorizontalRule />
    </EuiPopover>
  );
};
