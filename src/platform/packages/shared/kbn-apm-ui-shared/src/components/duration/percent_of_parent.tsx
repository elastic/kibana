/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { asPercent } from '../../utils';

interface PercentOfParentProps {
  duration: number;
  totalDuration?: number;
  parentType: 'trace' | 'transaction';
}

export function PercentOfParent({ duration, totalDuration, parentType }: PercentOfParentProps) {
  totalDuration = totalDuration || duration;
  const isOver100 = duration > totalDuration;
  const percentOfParent = isOver100 ? '>100%' : asPercent(duration, totalDuration, '');

  const percentOfParentText = i18n.translate('apmUiShared.duration.percentOfParent', {
    defaultMessage:
      '({value} of {parentType, select, transaction {transaction} trace {trace} other {unknown parentType}})',
    values: { value: percentOfParent, parentType },
  });

  const childType = parentType === 'trace' ? 'transaction' : 'span';

  return (
    <>
      {isOver100 ? (
        <EuiToolTip
          content={i18n.translate('apmUiShared.duration.percentOfTraceLabelExplanation', {
            defaultMessage:
              'The % of {parentType, select, transaction {transaction} trace {trace} other {unknown parentType} } exceeds 100% because this {childType, select, span {span} transaction {transaction} other {unknown childType} } takes longer than the root transaction.',
            values: {
              parentType,
              childType,
            },
          })}
        >
          <>{percentOfParentText}</>
        </EuiToolTip>
      ) : (
        percentOfParentText
      )}
    </>
  );
}
