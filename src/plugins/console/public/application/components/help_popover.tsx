/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiPopover, EuiTitle } from '@elastic/eui';

interface HelpPopoverProps {
  button: any;
  isOpen: boolean;
  closePopover: () => void;
}

export const HelpPopover = ({ button, isOpen, closePopover }: HelpPopoverProps) => {
  return (
    <EuiPopover button={button} isOpen={isOpen} closePopover={closePopover} anchorPosition="downRight">
      <EuiTitle size="xs">
        <h4>Elastic Console</h4>
      </EuiTitle>
      <p>
        Our UI for interacting with Elasticsearch clusters using QueryDSL. Easily run queries,
        manage settings, and view search results.
      </p>
    </EuiPopover>
  );
};
