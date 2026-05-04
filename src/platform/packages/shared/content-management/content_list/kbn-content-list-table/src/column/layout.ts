/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiTableFieldDataColumnType } from '@elastic/eui';

export type ColumnLayoutProps = Pick<
  EuiTableFieldDataColumnType<object>,
  'width' | 'minWidth' | 'maxWidth' | 'truncateText'
>;

export const getColumnLayoutProps = ({
  width,
  minWidth,
  maxWidth,
  truncateText,
}: ColumnLayoutProps): ColumnLayoutProps => ({
  ...(width && { width }),
  ...(minWidth && { minWidth }),
  ...(maxWidth && { maxWidth }),
  ...(truncateText !== undefined && { truncateText }),
});
