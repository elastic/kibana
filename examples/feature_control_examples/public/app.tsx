/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { EuiButton, EuiPanel, EuiText } from '@elastic/eui';

export const MyPluginComponent: React.FC = () => {
  const [time, setTime] = useState('');

  const fetchData = async () => {
    const response = await fetch('/internal/my_plugin/example');
    const data = await response.json();
    setTime(data.time);
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <EuiPanel>
      <EuiText>
        <p>Server Time: {time}</p>
      </EuiText>
      <EuiButton onClick={fetchData}>Refresh</EuiButton>
    </EuiPanel>
  );
};
