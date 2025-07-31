/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { PropsWithChildren } from 'react';
import { Observable } from 'rxjs';
import type { ChromeBreadcrumbsAppendExtension } from '@kbn/core-chrome-browser';
import useObservable from 'react-use/lib/useObservable';
import { EuiFlexGroup } from '@elastic/eui';
import classnames from 'classnames';
import { css } from '@emotion/react';
import { HeaderExtension } from './header_extension';

export interface Props {
  breadcrumbsAppendExtensions$: Observable<ChromeBreadcrumbsAppendExtension[]>;
}

const styles = {
  breadcrumbsWithExtensionContainer: css`
    overflow: hidden; // enables text-ellipsis in the last breadcrumb
    .euiHeaderBreadcrumbs,
    .euiBreadcrumbs {
      // stop breadcrumbs from growing.
      // this makes the extension appear right next to the last breadcrumb
      flex-grow: 0;
      margin-right: 0;

      overflow: hidden; // enables text-ellipsis in the last breadcrumb
    }

    .header__breadcrumbsAppendExtension--last {
      flex-grow: 1;
    }
  `,
};

export const BreadcrumbsWithExtensionsWrapper = ({
  breadcrumbsAppendExtensions$,
  children,
}: PropsWithChildren<Props>) => {
  const breadcrumbsAppendExtensions = useObservable(breadcrumbsAppendExtensions$, []);

  return breadcrumbsAppendExtensions.length === 0 ? (
    <>{children}</>
  ) : (
    <EuiFlexGroup
      responsive={false}
      wrap={false}
      alignItems={'center'}
      gutterSize={'none'}
      css={styles.breadcrumbsWithExtensionContainer}
    >
      {children}
      {breadcrumbsAppendExtensions.map((breadcrumbsAppendExtension, index) => {
        const isLast = breadcrumbsAppendExtensions.length - 1 === index;
        return (
          <HeaderExtension
            key={index}
            extension={breadcrumbsAppendExtension.content}
            containerClassName={classnames({
              'header__breadcrumbsAppendExtension--last': isLast,
            })}
          />
        );
      })}
    </EuiFlexGroup>
  );
};
