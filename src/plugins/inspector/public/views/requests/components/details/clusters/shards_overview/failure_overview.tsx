/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiDescriptionList, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FailureDetails } from './failure_details';

interface Props {
  failure: ShardFailure;
}

export function FailureOverview({ failure }: Props) {
  const [showDetails, setShowDetails] = useState(false);

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
    <>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiDescriptionList type="inline" listItems={items} compressed />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            flush="right"
            onClick={() => {
              setShowDetails(true);
            }}
            size="xs"
          >
            {i18n.translate('inspector.requests.shardsDetails.viewDetailsLabel', {
              defaultMessage: 'Details',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      {showDetails ? (
        <FailureDetails
          failure={failure}
          onClose={() => {
            setShowDetails(false);
          }}
        />
      ) : null}
    </>
  );
}
