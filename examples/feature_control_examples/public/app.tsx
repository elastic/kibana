/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButton, EuiHealth, EuiPageTemplate, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React, { useEffect, useState } from 'react';
import { FEATURE_PRIVILEGES_PLUGIN_ID } from '../common';

export const MyPluginComponent: React.FC = () => {
  const [time, setTime] = useState('');
  const kibana = useKibana<CoreStart>();

  const fetchData = async () => {
    const response = await fetch('/internal/my_plugin/read');
    const data = await response.json();

    // console.log(data2);
    setTime(data.time);
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <EuiPageTemplate>
      <EuiPageTemplate.Section grow={false} color="subdued" bottomBorder="extended">
        <EuiTitle size="l">
          <h1>Feature Privileges Example</h1>
        </EuiTitle>
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section grow={false} color="subdued" bottomBorder="extended">
        <EuiText>
          <p>Server Time: {time}</p>
        </EuiText>
        <EuiButton onClick={fetchData}>Refresh (Super user only)</EuiButton>
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section grow={false} color="subdued" bottomBorder="extended">
        <EuiText>
          <p>Your privileges</p>
        </EuiText>
        <EuiSpacer />
        {Object.entries(
          kibana.services.application!.capabilities[FEATURE_PRIVILEGES_PLUGIN_ID]
        ).map(([capability, value]) => {
          return value === true ? (
            <div key={capability}>
              <EuiHealth color="success">{capability}</EuiHealth>
              <EuiSpacer />
            </div>
          ) : null;
        })}
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
