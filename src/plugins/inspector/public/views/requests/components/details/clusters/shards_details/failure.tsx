/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiDescriptionList } from '@elastic/eui';

interface Props {
  failure: ShardFailure;
}

export function Failure({ failure }: Props) {
  const items = [
    {
      title: i18n.translate('inspector.requests.shardsDetails.shardTitle', {
        defaultMessage: 'Shard',
      }),
      description: failure.shard,
    },
    {
      title: i18n.translate('inspector.requests.shardsDetails.indexTitle', {
        defaultMessage: 'Index',
      }),
      description: failure.index ?? '',
    },
    {
      title: i18n.translate('inspector.requests.shardsDetails.reasonTypeTitle', {
        defaultMessage: 'Type',
      }),
      description: failure.reason.type,
    },
  ];

  return (
    <EuiDescriptionList
      type="responsiveColumn"
      columnWidths={[1, 6]}
      listItems={items}
      compressed
    />
  );
}