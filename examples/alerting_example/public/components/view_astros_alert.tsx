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
import React, { useState, useEffect, Fragment } from 'react';

import {
  EuiText,
  EuiLoadingKibana,
  EuiCallOut,
  EuiTextColor,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiStat,
} from '@elastic/eui';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { CoreStart } from 'kibana/public';
import { isEmpty } from 'lodash';
import {
  Alert,
  AlertTaskState,
  BASE_ALERT_API_PATH,
} from '../../../../x-pack/plugins/alerts/common';
import { ALERTING_EXAMPLE_APP_ID } from '../../common/constants';

type Props = RouteComponentProps & {
  http: CoreStart['http'];
  id: string;
};

function hasCraft(state: any): state is { craft: string } {
  return state && state.craft;
}
export const ViewPeopleInSpaceAlertPage = withRouter(({ http, id }: Props) => {
  const [alert, setAlert] = useState<Alert | null>(null);
  const [alertState, setAlertState] = useState<AlertTaskState | null>(null);

  useEffect(() => {
    if (!alert) {
      http.get(`${BASE_ALERT_API_PATH}/alert/${id}`).then(setAlert);
    }
    if (!alertState) {
      http.get(`${BASE_ALERT_API_PATH}/alert/${id}/state`).then(setAlertState);
    }
  }, [alert, alertState, http, id]);

  return alert && alertState ? (
    <Fragment>
      <EuiCallOut title={`Alert "${alert.name}"`} iconType="search">
        <p>
          This is a specific view for all
          <EuiTextColor color="accent"> example.people-in-space </EuiTextColor> Alerts created by
          the
          <EuiTextColor color="accent"> {ALERTING_EXAMPLE_APP_ID} </EuiTextColor>
          plugin.
        </p>
      </EuiCallOut>
      <EuiSpacer size="l" />
      <EuiText>
        <h2>Alert Instances</h2>
      </EuiText>
      {isEmpty(alertState.alertInstances) ? (
        <EuiCallOut title="No Alert Instances!" color="warning" iconType="help">
          <p>
            The people in {alert.params.craft} at the moment <b>are not</b> {alert.params.op}{' '}
            {alert.params.outerSpaceCapacity}
          </p>
        </EuiCallOut>
      ) : (
        <Fragment>
          <EuiCallOut title="Active State" color="success" iconType="user">
            <p>
              The alert has been triggered because the people in {alert.params.craft} at the moment{' '}
              {alert.params.op} {alert.params.outerSpaceCapacity}
            </p>
          </EuiCallOut>
          <EuiSpacer size="l" />
          <div>
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiStat
                  title={Object.keys(alertState.alertInstances ?? {}).length}
                  description={`People in ${alert.params.craft}`}
                  titleColor="primary"
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiDescriptionList compressed>
                  {Object.entries(alertState.alertInstances ?? {}).map(
                    ([instance, { state }], index) => (
                      <Fragment key={index}>
                        <EuiDescriptionListTitle>{instance}</EuiDescriptionListTitle>
                        <EuiDescriptionListDescription>
                          {hasCraft(state) ? state.craft : 'Unknown Craft'}
                        </EuiDescriptionListDescription>
                      </Fragment>
                    )
                  )}
                </EuiDescriptionList>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        </Fragment>
      )}
    </Fragment>
  ) : (
    <EuiLoadingKibana size="xl" />
  );
});
