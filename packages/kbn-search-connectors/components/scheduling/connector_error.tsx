/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IngestionStatus } from '@kbn/search-connectors/types/indices';
import React from 'react';

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
