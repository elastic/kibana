/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IngestionStatus } from '../../types/indices';

export const ConnectorError: React.FC<{ ingestionStatus: IngestionStatus }> = ({
  ingestionStatus,
}) => {
  return ingestionStatus === IngestionStatus.ERROR ? (
    <>
      <EuiCallOut
        color="warning"
        iconType="warning"
        title={i18n.translate('searchConnectors.content.indices.connectorScheduling.error.title', {
          defaultMessage: 'Review your connector configuration for reported errors.',
        })}
      />
      <EuiSpacer size="l" />
    </>
  ) : (
    <></>
  );
};
