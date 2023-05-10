/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext } from 'react';
import { EuiIcon, EuiCard, EuiSpacer } from '@elastic/eui';

import { HelpCenterContext } from './help_center_header_nav_button';
import { css } from '@emotion/react';

export const DocumentationCards = () => {
  const { helpFetchResults } = useContext(HelpCenterContext);

  return (
    <>
      {(helpFetchResults?.documentation ?? []).map((doc) => {
        return (
          <>
            <EuiCard
              css={css`
                margin-block-end: 0;
              `}
              layout={'horizontal'}
              icon={<EuiIcon size="xl" type={doc.iconType ?? 'document'} />}
              title={`Visit the ${doc.title} documentation`}
              target="_blank"
              href={doc.href}
              titleSize="xs"
            />
            <EuiSpacer size="s" />
          </>
        );
      })}
    </>
  );
};
