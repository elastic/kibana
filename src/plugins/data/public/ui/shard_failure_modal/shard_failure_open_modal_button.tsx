/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { estypes } from '@elastic/elasticsearch';
import { EuiButton, EuiTextAlign } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { toMountPoint } from '../../../../kibana_react/public/util/to_mount_point';
import { getOverlays } from '../../services';
import { ShardFailureModal } from './shard_failure_modal';
import type { ShardFailureRequest } from './shard_failure_types';

// @internal
export interface ShardFailureOpenModalButtonProps {
  request: ShardFailureRequest;
  response: estypes.SearchResponse<any>;
  title: string;
}

// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default function ShardFailureOpenModalButton({
  request,
  response,
  title,
}: ShardFailureOpenModalButtonProps) {
  function onClick() {
    const modal = getOverlays().openModal(
      toMountPoint(
        <ShardFailureModal
          request={request}
          response={response}
          title={title}
          onClose={() => modal.close()}
        />
      ),
      {
        className: 'shardFailureModal',
      }
    );
  }
  return (
    <EuiTextAlign textAlign="right">
      <EuiButton
        color="warning"
        size="s"
        onClick={onClick}
        data-test-subj="openShardFailureModalBtn"
      >
        <FormattedMessage
          id="data.search.searchSource.fetch.shardsFailedModal.showDetails"
          defaultMessage="Show details"
          description="Open the modal to show details"
        />
      </EuiButton>
    </EuiTextAlign>
  );
}
