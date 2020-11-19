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

import React, { FunctionComponent, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiText, EuiButton, EuiSpacer } from '@elastic/eui';

interface Props {
  error: Error;
  onButtonClick: () => void;
}

export const SomethingWentWrongCallout: FunctionComponent<Props> = ({ error, onButtonClick }) => {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <EuiCallOut
      iconType="alert"
      color="danger"
      title={i18n.translate('console.loadingError.title', {
        defaultMessage: 'Cannot load Console',
      })}
    >
      <EuiText>
        <p>
          <FormattedMessage
            id="console.loadingError.message"
            defaultMessage="Try reloading to get the latest data."
          />
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiButton color="danger" onClick={() => onButtonClick()}>
        <FormattedMessage id="console.loadingError.buttonLabel" defaultMessage="Reload Console" />
      </EuiButton>
    </EuiCallOut>
  );
};
