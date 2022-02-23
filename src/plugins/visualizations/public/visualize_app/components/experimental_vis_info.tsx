/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo } from 'react';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const InfoComponent = () => {
  const title = (
    <>
      <FormattedMessage
        id="visualizations.experimentalVisInfoText"
        defaultMessage="This functionality is in technical preview and may be changed or removed completely in a future release.
          Elastic will take a best effort approach to fix any issues, but features in technical preview
          are not subject to the support SLA of official GA features.
          For feedback, please create an issue in {githubLink}."
        values={{
          githubLink: (
            <EuiLink
              external
              href="https://github.com/elastic/kibana/issues/new/choose"
              target="_blank"
            >
              GitHub
            </EuiLink>
          ),
        }}
      />
    </>
  );

  return (
    <EuiCallOut
      className="hide-for-sharing"
      data-test-subj="experimentalVisInfo"
      size="s"
      title={title}
      iconType="beaker"
    />
  );
};

export const ExperimentalVisInfo = memo(InfoComponent);
