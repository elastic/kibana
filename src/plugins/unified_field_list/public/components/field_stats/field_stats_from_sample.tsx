/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { CoreStart } from '@kbn/core/public';
import { EuiButton, EuiText } from '@elastic/eui';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FieldStatsFromSampleProps {}

export const FieldStatsFromSample: React.FC<FieldStatsFromSampleProps> = () => {
  const { services } = useKibana<{ http: CoreStart['http'] }>();
  const { http } = services;
  // Use React hooks to manage state.
  const [timestamp, setTimestamp] = useState<string | undefined>();

  const onClickHandler = () => {
    // Use the core http service to make a response to the server API.
    http?.get('/api/unified_field_list/example').then((res) => {
      setTimestamp((res as unknown as { time: string }).time);
    });
  };

  return (
    <EuiText>
      <p>
        <FormattedMessage
          id="unifiedFieldList.timestampText"
          defaultMessage="Last timestamp: {time}"
          values={{ time: timestamp ? timestamp : 'Unknown' }}
        />
        <EuiButton type="primary" size="s" onClick={onClickHandler}>
          <FormattedMessage id="unifiedFieldList.buttonText" defaultMessage="Get data" />
        </EuiButton>
      </p>
    </EuiText>
  );
};
