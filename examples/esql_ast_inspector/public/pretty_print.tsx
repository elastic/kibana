/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { parse, WrappingPrettyPrinter } from '@kbn/esql-ast';
import * as React from 'react';
import { EuiCodeBlock } from '@elastic/eui';

export interface PrettyPrintProps {
  src: string;
}

export const PrettyPrint: React.FC<PrettyPrintProps> = ({ src }) => {
  const formatted = React.useMemo(() => {
    try {
      const { root } = parse(src, { withFormatting: true });

      return WrappingPrettyPrinter.print(root);
    } catch {
      return '';
    }
  }, [src]);

  return (
    <EuiCodeBlock language="esql" fontSize="m" paddingSize="m">
      {formatted}
    </EuiCodeBlock>
  );
};
