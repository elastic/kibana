/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo, useMemo } from 'react';
import { EuiExpression } from '@elastic/eui';

import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { OS_LABELS } from '../conditions.config';
import * as i18n from '../../translations';

export interface OsConditionsProps {
  dataTestSubj?: string;
  os: ExceptionListItemSchema['os_types'];
}

export const OsCondition = memo<OsConditionsProps>(({ os, dataTestSubj }) => {
  const osLabel = useMemo(() => {
    return os.map((osValue) => OS_LABELS[osValue] ?? osValue).join(', ');
  }, [os]);
  return osLabel ? (
    <div data-test-subj={`${dataTestSubj || ''}Os`}>
      <strong>
        <EuiExpression data-test-subj="osLabel" description="" value={i18n.CONDITION_OS} />
        <EuiExpression
          data-test-subj="osValue"
          description={i18n.CONDITION_OPERATOR_TYPE_MATCH}
          value={osLabel}
        />
      </strong>
    </div>
  ) : null;
});
OsCondition.displayName = 'OsCondition';
