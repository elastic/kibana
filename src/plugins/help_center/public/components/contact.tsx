/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext } from 'react';
import { EuiSpacer, EuiButtonEmpty } from '@elastic/eui';

import { HelpCenterContext } from './help_center_header_nav_button';
export const Contact = () => {
  const { helpFetchResults } = useContext(HelpCenterContext);
  return (
    <>
      {(helpFetchResults?.contact ?? []).map((contact) => {
        return (
          <>
            <EuiButtonEmpty
              href={contact.href}
              target="_blank"
              size="s"
              iconType={contact.iconType}
              flush="left"
              aria-label={contact.title}
            >
              {contact.title}
            </EuiButtonEmpty>
            <EuiSpacer size="s" />
          </>
        );
      })}
    </>
  );
};
