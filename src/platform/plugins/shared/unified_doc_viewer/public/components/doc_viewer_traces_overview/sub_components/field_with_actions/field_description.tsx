/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiIconTip } from '@elastic/eui';
import { PartialFieldMetadataPlain } from '@kbn/fields-metadata-plugin/common';
import React from 'react';

export function FieldDescription({ fieldMetadata }: { fieldMetadata: PartialFieldMetadataPlain }) {
  const { flat_name: fieldName } = fieldMetadata;

  return <EuiIconTip content={fieldName} color="subdued" />;
}

// eslint-disable-next-line import/no-default-export
export default FieldDescription;
