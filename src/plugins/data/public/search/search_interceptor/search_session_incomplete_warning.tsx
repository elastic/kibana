/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { DocLinksStart } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export const SearchSessionIncompleteWarning = (docLinks: DocLinksStart) => (
  <>
    <EuiSpacer size="s" />
    It needs more time to fully render. You can wait here or come back to it later.
    <EuiSpacer size="m" />
    <EuiText textAlign="right">
      <EuiLink
        href={docLinks.links.search.sessionLimits}
        color="warning"
        target="_blank"
        data-test-subj="searchSessionIncompleteWarning"
        external
      >
        <FormattedMessage id="data.searchSession.warning.readDocs" defaultMessage="Read More" />
      </EuiLink>
    </EuiText>
  </>
);
