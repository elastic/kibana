/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiTextAlign } from '@elastic/eui';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { getOverlays } from '../../services';
import { ThemeServiceStart } from '../../../../../core/public';
import { toMountPoint } from '../../../../kibana_react/public';
import { ShardFailureModal } from './shard_failure_modal';
import { ShardFailureRequest } from './shard_failure_types';

// @internal
export interface ShardFailureOpenModalButtonProps {
  request: ShardFailureRequest;
  response: estypes.SearchResponse<any>;
  theme: ThemeServiceStart;
  title: string;
}

// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default function ShardFailureOpenModalButton({
  request,
  response,
  theme,
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
        />,
        { theme$: theme.theme$ }
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
