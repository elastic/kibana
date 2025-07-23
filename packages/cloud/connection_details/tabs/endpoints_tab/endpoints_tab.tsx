/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiForm } from '@elastic/eui';
import * as React from 'react';
import { useConnectionDetailsOpts } from '../../context';
import { CloudIdRow } from './rows/cloud_id_row';
import { EndpointUrlRow } from './rows/endpoints_url_row';

export const EndpointsTab: React.FC = () => {
  const { endpoints } = useConnectionDetailsOpts();

  if (!endpoints) return null;

  return (
    <EuiForm component="div">
      {!!endpoints?.url && <EndpointUrlRow url={endpoints.url} />}
      {!!endpoints?.id && <CloudIdRow value={endpoints.id} />}
    </EuiForm>
  );
};
