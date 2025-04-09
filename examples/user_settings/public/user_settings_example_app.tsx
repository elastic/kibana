/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC } from 'react';
import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { AppServices } from './types';
import { Layout } from './layout';
import { TableConfigSetting } from './table_config_setting';
import { SpaceAgnosticSetting } from './space_agnostic_setting';

interface UserSettingsExampleProps {
  services: AppServices;
}

export const UserSettingsExample: FC<UserSettingsExampleProps> = ({ services }) => {
  return (
    <Layout>
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexItem>
          <TableConfigSetting services={services} />
        </EuiFlexItem>
        <EuiFlexItem>
          <SpaceAgnosticSetting services={services} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </Layout>
  );
};
