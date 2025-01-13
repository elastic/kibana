/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import { EuiTabbedContent, EuiTabbedContentProps } from '@elastic/eui';
import { PreviewAst } from './components/preview_ast';
import { PreviewTokens } from './components/preview_tokens';
import { PreviewUi } from './components/preview_ui';
import { PreviewPrint } from './components/preview_print';

export const Preview: React.FC = () => {
  const tabs: EuiTabbedContentProps['tabs'] = [
    {
      id: 'ui',
      name: 'UI',
      content: <PreviewUi />,
    },
    {
      id: 'formatter',
      name: 'Formatter',
      content: <PreviewPrint />,
    },
    {
      id: 'ast',
      name: 'AST',
      content: <PreviewAst />,
    },
    {
      id: 'tokens',
      name: 'Tokens',
      content: <PreviewTokens />,
    },
  ];

  return <EuiTabbedContent tabs={tabs} />;
};
