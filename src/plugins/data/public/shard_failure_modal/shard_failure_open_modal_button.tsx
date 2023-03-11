/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink, EuiButton, EuiButtonProps } from '@elastic/eui';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ThemeServiceStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { getOverlays } from '../services';
import { ShardFailureModal } from './shard_failure_modal';
import type { ShardFailureRequest } from './shard_failure_types';

// @internal
export interface ShardFailureOpenModalButtonProps {
  theme: ThemeServiceStart;
  title: string;
  size?: EuiButtonProps['size'];
  color?: EuiButtonProps['color'];
  getRequestMeta: () => {
    request: ShardFailureRequest;
    response: estypes.SearchResponse<any>;
  };
  isButtonEmpty?: boolean;
}

// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default function ShardFailureOpenModalButton({
  getRequestMeta,
  theme,
  title,
  size = 's',
  color = 'warning',
  isButtonEmpty = false,
}: ShardFailureOpenModalButtonProps) {
  const onClick = useCallback(() => {
    const { request, response } = getRequestMeta();
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
  }, [getRequestMeta, theme.theme$, title]);

  const Component = isButtonEmpty ? EuiLink : EuiButton;

  return (
    <Component
      color={color}
      size={size}
      onClick={onClick}
      data-test-subj="openShardFailureModalBtn"
    >
      <FormattedMessage
        id="data.search.searchSource.fetch.shardsFailedModal.showDetails"
        defaultMessage="Show details"
        description="Open the modal to show details"
      />
    </Component>
  );
}
