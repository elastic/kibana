/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { FormInfoField } from '../form_info_field/form_info_field';
import { useElasticsearchUrl } from '../../hooks/use_elasticsearch_url';

export const ConnectionDetails: React.FC = () => {
  const elasticsearchUrl = useElasticsearchUrl();

  return (
    <FormInfoField
      label={i18n.translate('searchApiPanels.connectionDetails.endpointTitle', {
        defaultMessage: 'Elasticsearch URL',
      })}
      value={elasticsearchUrl}
      copyValue={elasticsearchUrl}
      dataTestSubj="connectionDetailsEndpoint"
      copyValueDataTestSubj="connectionDetailsEndpointCopy"
      minWidth={400}
    />
  );
};
