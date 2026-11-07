/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ReactNode } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { ImportJsonErrorDetails } from './import_json_error_details';

interface ImportJsonServerErrorCalloutProps {
  dataTestSubjPrefix: string;
  title: string;
  text?: ReactNode;
  details?: string;
}

/** Shows that the server rejected the imported JSON, with collapsible details when available. */
export const ImportJsonServerErrorCallout = ({
  dataTestSubjPrefix,
  title,
  text,
  details,
}: ImportJsonServerErrorCalloutProps) => (
  <>
    <KbnDangerCallout
      announceOnMount
      title={title}
      data-test-subj={`${dataTestSubjPrefix}ServerError`}
    >
      {text}
      {details && (
        <ImportJsonErrorDetails dataTestSubjPrefix={dataTestSubjPrefix} details={details} />
      )}
    </KbnDangerCallout>
    <EuiSpacer size="m" />
  </>
);
