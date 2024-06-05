/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexGroup, EuiIconTip } from '@elastic/eui';
import { PartialFieldMetadataPlain } from '@kbn/fields-metadata-plugin/common';
import { FieldIcon } from '@kbn/react-field';
import React from 'react';

export function HighlightFieldDescription({
  fieldMetadata,
}: {
  fieldMetadata: PartialFieldMetadataPlain;
}) {
  const { flat_name: fieldName, short, type } = fieldMetadata;

  const title = (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      {type && <FieldIcon type={type} size="s" />}
      {fieldName}
    </EuiFlexGroup>
  );

  return <EuiIconTip title={title} content={short} color="subdued" />;
}

// eslint-disable-next-line import/no-default-export
export default HighlightFieldDescription;
