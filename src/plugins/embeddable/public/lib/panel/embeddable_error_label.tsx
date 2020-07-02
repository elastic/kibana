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
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EmbeddableError } from '../embeddables/i_embeddable';

interface Props {
  error?: EmbeddableError;
}

export function EmbeddableErrorLabel(props: Props) {
  if (!props.error) return null;
  const labelText =
    props.error.name === 'AbortError'
      ? i18n.translate('embeddableApi.panel.labelAborted', {
          defaultMessage: 'Aborted',
        })
      : i18n.translate('embeddableApi.panel.labelError', {
          defaultMessage: 'Error',
        });

  return (
    <div className="embPanel__labelWrapper">
      <div className="embPanel__label">
        <EuiToolTip content={props.error.message}>
          <EuiBadge color="danger">{labelText}</EuiBadge>
        </EuiToolTip>
      </div>
    </div>
  );
}
