/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { EuiPageTemplate } from '@elastic/eui';
import { Error } from './error';
import { RedirectManager } from '../redirect_manager';
import { Spinner } from './spinner';

export interface PageProps {
  manager: Pick<RedirectManager, 'error$'>;
}

export const Page: React.FC<PageProps> = ({ manager }) => {
  const error = useObservable(manager.error$);

  if (error) {
    return (
      <EuiPageTemplate
        template="centeredContent"
        pageContentProps={{
          color: 'danger',
        }}
      >
        <Error error={error} />
      </EuiPageTemplate>
    );
  }

  return (
    <EuiPageTemplate
      template="centeredContent"
      pageContentProps={{
        color: 'primary',
      }}
    >
      <Spinner />
    </EuiPageTemplate>
  );
};
