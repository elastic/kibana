/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty } from '@elastic/eui';
import { FailureOverview } from './failure_overview';

interface Props {
  failures: ShardFailure[];
}

export function Failures({ failures }: Props) {
  if (failures.length === 0) {
    return null;
  }

  const [isOpen, setIsOpen] = useState(false);

  const button = (
    <EuiButtonEmpty
      flush="left"
      onClick={() => {
        setIsOpen(!isOpen);
      }}
      size="xs"
    >
      {isOpen
        ? i18n.translate('inspector.requests.shardsDetails.hideFailuresLabel', {
            defaultMessage: 'Hide failures',
          })
        : i18n.translate('inspector.requests.shardsDetails.showFailuresLabel', {
            defaultMessage: 'Show failures',
          })}
    </EuiButtonEmpty>
  );

  return isOpen ? (
    <>
      {button}
      {failures.map((failure) => {
        return <FailureOverview key={failure.shard} failure={failure} />;
      })}
    </>
  ) : (
    button
  );
}
