/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiLink, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  href: string;
  ['data-test-subj']?: string;
}

export function DocumentationLink({ href, ['data-test-subj']: dataTestSubj }: Props) {
  return (
    <dl>
      <EuiTitle size="xxs">
        <dt className="eui-displayInline">
          <FormattedMessage
            id="sharedUXPackages.noDataViewsPrompt.learnMore"
            defaultMessage="Want to learn more?"
          />
        </dt>
      </EuiTitle>
      &emsp;
      <dd className="eui-displayInline">
        <EuiLink href={href} target="_blank" data-test-subj={dataTestSubj} external>
          <FormattedMessage
            id="sharedUXPackages.noDataViewsPrompt.readDocumentation"
            defaultMessage="Read the docs"
          />
        </EuiLink>
      </dd>
    </dl>
  );
}
