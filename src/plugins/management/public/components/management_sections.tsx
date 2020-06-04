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
import { EuiFlexGroup, EuiFlexItem, EuiToolTip, EuiIcon } from '@elastic/eui';

import { ManagementSectionId } from '../types';

interface ManagementSectionTitleProps {
  text: string;
  tip: string;
}

const ManagementSectionTitle = ({ text, tip }: ManagementSectionTitleProps) => (
  <EuiToolTip content={tip} position="right">
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>{text}</EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiIcon type="questionInCircle" />
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiToolTip>
);

export const managementSections = [
  {
    id: ManagementSectionId.Ingest,
    title: (
      <ManagementSectionTitle
        text="Ingest"
        tip="Manage how to transform data and load it into the cluster."
      />
    ),
  },
  {
    id: ManagementSectionId.Data,
    title: <ManagementSectionTitle text="Data" tip="Manage your cluster data and backups" />,
  },
  {
    id: ManagementSectionId.InsightsAndAlerting,
    title: (
      <ManagementSectionTitle
        text="Alerts and Insights"
        tip="Manage how to detect changes in your data"
      />
    ),
  },
  {
    id: ManagementSectionId.Security,
    title: <ManagementSectionTitle text="Security" tip="Control access to features and data" />,
  },
  {
    id: ManagementSectionId.Kibana,
    title: <ManagementSectionTitle text="Kibana" tip="Customize Kibana and manage saved objects" />,
  },
  {
    id: ManagementSectionId.Stack,
    title: <ManagementSectionTitle text="Stack" tip="Manage your license and upgrade the Stack" />,
  },
];
