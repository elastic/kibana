/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  SearchResponseWarnings,
  type SearchResponseInterceptedWarning,
} from '@kbn/search-response-warnings';

export interface SavedSearchEmbeddableBadgeProps {
  interceptedWarnings: SearchResponseInterceptedWarning[] | undefined;
}

export const SavedSearchEmbeddableBadge: React.FC<SavedSearchEmbeddableBadgeProps> = ({
  interceptedWarnings,
}) => {
  return interceptedWarnings?.length ? (
    <div
      css={css({
        position: 'absolute',
        zIndex: 2,
        left: 0,
        bottom: 0,
      })}
    >
      <SearchResponseWarnings
        variant="badge"
        interceptedWarnings={interceptedWarnings}
        data-test-subj="savedSearchEmbeddableWarningsCallout"
      />
    </div>
  ) : null;
};
