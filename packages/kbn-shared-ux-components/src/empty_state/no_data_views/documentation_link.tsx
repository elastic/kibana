/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiLink, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  href: string;
}

export function DocumentationLink({ href }: Props) {
  return (
    <dl>
      <EuiTitle size="xxs">
        <dt className="eui-displayInline">
          <FormattedMessage
            id="sharedUXComponents.noDataViews.learnMore"
            defaultMessage="Want to learn more?"
          />
        </dt>
      </EuiTitle>
      &emsp;
      <dd className="eui-displayInline">
        <EuiLink href={href} target="_blank" external>
          <FormattedMessage
            id="sharedUXComponents.noDataViews.readDocumentation"
            defaultMessage="Read the docs"
          />
        </EuiLink>
      </dd>
    </dl>
  );
}
