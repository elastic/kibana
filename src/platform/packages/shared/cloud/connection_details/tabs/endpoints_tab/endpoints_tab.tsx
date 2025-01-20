/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiForm } from '@elastic/eui';
import * as React from 'react';
import { useConnectionDetailsOpts, useConnectionDetailsService } from '../../context';
import { useBehaviorSubject } from '../../hooks/use_behavior_subject';
import { CloudIdRow } from './rows/cloud_id_row';
import { EndpointUrlRow } from './rows/endpoints_url_row';

export const EndpointsTab: React.FC = () => {
  const { endpoints } = useConnectionDetailsOpts();
  const service = useConnectionDetailsService();
  const showCloudId = useBehaviorSubject(service.showCloudId$);

  if (!endpoints) return null;

  return (
    <EuiForm component="div">
      {!!endpoints?.url && (
        <EndpointUrlRow
          url={endpoints.url}
          onCopyClick={() => service.emitTelemetryEvent(['copy_endpoint_url_clicked'])}
        />
      )}
      {!!endpoints?.id && (
        <CloudIdRow
          value={endpoints.id}
          showCloudId={showCloudId}
          learnMoreUrl={service.opts.endpoints?.cloudIdLearMoreLink}
          onShowCloudIdToggle={service.toggleShowCloudId}
          onCopyClick={() => service.emitTelemetryEvent(['copy_cloud_id_clicked'])}
        />
      )}
    </EuiForm>
  );
};
