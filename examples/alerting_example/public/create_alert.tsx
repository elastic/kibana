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
import React, { useState } from 'react';
import uuid from 'uuid';
import { random, range } from 'lodash';

import {
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
  EuiButton,
} from '@elastic/eui';
import { CoreStart } from 'kibana/public';
import { EuiGlobalToastList } from '@elastic/eui';
import { Toast } from '@elastic/eui/src/components/toast/global_toast_list';
import { ALERTING_EXAMPLE_APP_ID } from '../common/constants';

export const CreateAlertPage = ({ http }: { http: CoreStart['http'] }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = (removedToast: Toast) => {
    setToasts(toasts.filter(toast => toast.id !== removedToast.id));
  };

  return (
    <EuiPageBody data-test-subj="dataPluginExplorerHome">
      <EuiPageHeader>
        <EuiPageHeaderSection>
          <EuiTitle size="l">
            <h1>Alerting plugin example</h1>
          </EuiTitle>
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <EuiPageContent>
        <EuiPageContentHeader>
          <EuiPageContentHeaderSection>
            <EuiTitle>
              <h2>Create Alert</h2>
            </EuiTitle>
          </EuiPageContentHeaderSection>
        </EuiPageContentHeader>
        <EuiPageContentBody>
          <EuiButton
            onClick={() => {
              http
                .post('/api/alert', {
                  body: JSON.stringify({
                    name: `example-alert-${uuid.v4()}`,
                    enabled: true,
                    alertTypeId: `.alerting-example`,
                    consumer: ALERTING_EXAMPLE_APP_ID,
                    tags: [],
                    throttle: '1m',
                    params: { instances: range(random(3, 10)).map(() => ({ id: uuid.v4() })) },
                    schedule: {
                      interval: '1m',
                    },
                    actions: [],
                  }),
                })
                .then(res =>
                  setToasts(
                    toasts.concat([
                      {
                        id: uuid.v4(),
                        title: 'Alert Created!',
                        color: 'success',
                        text: <p>Created Alert with ID: {res.id}</p>,
                      },
                    ])
                  )
                )
                .catch(ex =>
                  setToasts(
                    toasts.concat([
                      {
                        id: uuid.v4(),
                        title: 'Alert creation failed',
                        color: 'danger',
                        text: <p>Threw error: {ex}</p>,
                      },
                    ])
                  )
                );
            }}
          >
            Create
          </EuiButton>
          <EuiGlobalToastList toasts={toasts} dismissToast={removeToast} toastLifeTimeMs={6000} />
        </EuiPageContentBody>
      </EuiPageContent>
    </EuiPageBody>
  );
};
