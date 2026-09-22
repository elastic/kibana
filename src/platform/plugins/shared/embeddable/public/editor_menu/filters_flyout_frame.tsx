/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { EuiSkeletonText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

/** Shows a skeleton until the async filters action mounts its body. */
export const FiltersFlyoutFrame = ({
  readBody,
  subscribe,
}: {
  readBody: () => React.ReactElement | undefined;
  subscribe: (publish: (body: React.ReactElement) => void) => () => void;
}): React.ReactElement => {
  const [body, setBody] = useState<React.ReactElement | undefined>(() => readBody());
  useEffect(() => subscribe(setBody), [subscribe]);
  if (body) return body;
  return (
    <EuiSkeletonText
      lines={3}
      data-test-subj="editorFiltersFlyoutLoading"
      aria-label={i18n.translate('embeddableApi.editorMenu.filtersActionLoadingAriaLabel', {
        defaultMessage: 'Loading filters',
      })}
    />
  );
};
