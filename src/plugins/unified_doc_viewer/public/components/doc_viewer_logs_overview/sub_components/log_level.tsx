/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { CSSObject } from '@emotion/react';
import { LogDocumentOverview } from '@kbn/discover-utils';
import { LogLevelBadge } from '@kbn/discover-utils';

const dataTestSubj = 'unifiedDocViewLogsOverviewLogLevel';
const badgeCss: CSSObject = { maxWidth: '100px' };

interface LogLevelProps {
  level: LogDocumentOverview['log.level'];
}

export function LogLevel({ level }: LogLevelProps) {
  if (!level) return null;

  return (
    <LogLevelBadge
      logLevel={level}
      fallback={
        <EuiBadge color="hollow" data-test-subj={dataTestSubj} css={badgeCss}>
          {level}
        </EuiBadge>
      }
      css={badgeCss}
      data-test-subj={dataTestSubj}
    />
  );
}
