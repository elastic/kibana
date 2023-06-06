/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext } from 'react';
import { EuiSpacer, EuiButtonEmpty, EuiIcon, EuiCard } from '@elastic/eui';

import { HelpCenterContext } from './help_center_header_nav_button';
export const Contact = () => {
  const { helpFetchResults } = useContext(HelpCenterContext);
  return (
    <>
      {(helpFetchResults?.contact ?? []).map((contact, i) => {
        return (
          <>
            <EuiCard
              className="help-center-card"
              hasBorder={true}
              id={`contact_card_${i}`}
              layout={'horizontal'}
              icon={<EuiIcon size="l" type={contact.iconType ?? 'discuss'} />}
              title={contact.title ?? ''}
              target="_blank"
              paddingSize="s"
              href={contact.href}
              titleSize="xs"
            />
            <EuiSpacer size="s" />
          </>
        );
      })}
    </>
  );
};
