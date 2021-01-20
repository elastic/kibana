/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { memo } from 'react';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export const InfoComponent = () => {
  const title = (
    <>
      <FormattedMessage
        id="visualize.experimentalVisInfoText"
        defaultMessage="This visualization is experimental and is not subject to the support SLA of official GA features.
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
