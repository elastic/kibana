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
import React, { useState, useEffect } from 'react';

import { EuiText, EuiLoadingKibana } from '@elastic/eui';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { CoreStart } from 'kibana/public';
import { Alert, AlertTaskState } from '../../../x-pack/plugins/alerting/common';

type Props = RouteComponentProps & {
  http: CoreStart['http'];
  id: string;
};
export const ViewAlertPage = withRouter(({ http, id }: Props) => {
  const [alert, setAlert] = useState<Alert | null>(null);
  const [alertState, setAlertState] = useState<AlertTaskState | null>(null);

  useEffect(() => {
    if (!alert) {
      http.get(`/api/alert/${id}`).then(setAlert);
    }
    if (!alertState) {
      http.get(`/api/alert/${id}/state`).then(setAlertState);
    }
  }, [alert, alertState, http, id]);

  return alert && alertState ? (
    <EuiText>
      <h2>Alert JSON</h2>
      <p>{JSON.stringify(alert)}</p>
      <p>{JSON.stringify(alertState)}</p>
    </EuiText>
  ) : (
    <EuiLoadingKibana size="xl" />
  );
});
