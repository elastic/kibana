/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React from 'react';
// @ts-ignore
import { npStart } from 'ui/new_platform';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButton, EuiTextAlign } from '@elastic/eui';

import { toMountPoint } from '../../../../../../plugins/kibana_react/public';
import { ShardFailureModal } from './shard_failure_modal';
import { ResponseWithShardFailure, Request } from './shard_failure_types';

interface Props {
  request: Request;
  response: ResponseWithShardFailure;
  title: string;
}

export function ShardFailureOpenModalButton({ request, response, title }: Props) {
  function onClick() {
    const modal = npStart.core.overlays.openModal(
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
          id="common.ui.courier.fetch.shardsFailedModal.showDetails"
          defaultMessage="Show details"
          description="Open the modal to show details"
        />
      </EuiButton>
    </EuiTextAlign>
  );
}
