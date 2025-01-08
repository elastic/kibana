/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { useHistory } from 'react-router-dom';
import { EuiSideNav } from '@elastic/eui';

export function Sidebar({ pages }: { pages: Array<{ id: string; title: string }> }) {
  const history = useHistory();

  const items = useMemo(() => {
    return pages.map((page) => {
      return {
        id: page.id,
        name: page.title,
        onClick: () => history.push(`/${page.id}`),
      };
    });
  }, [pages, history]);

  return (
    <EuiSideNav
      css={{
        css: css`
          maxwidth: '85%';
        `,
      }}
      truncate={false}
      items={items}
    />
  );
}
