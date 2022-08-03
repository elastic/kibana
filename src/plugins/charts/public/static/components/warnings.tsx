/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButtonIcon, EuiPopover } from '@elastic/eui';
import React, { useState } from 'react';

export function Warnings({ warnings }: { warnings: React.ReactNode[] }) {
  const [open, setOpen] = useState(false);
  if (warnings.length === 0) return null;
  return (
    <EuiPopover
      isOpen={open}
      closePopover={() => setOpen(false)}
      button={<EuiButtonIcon onClick={() => setOpen(!open)} color="warning" iconType="alert" />}
    >
      <div style={{ maxWidth: 512 }}>
        {warnings.map((w, i) => (
          <React.Fragment key={i}>
            {w}
            <br />
          </React.Fragment>
        ))}
      </div>
    </EuiPopover>
  );
}
