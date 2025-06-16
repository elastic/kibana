/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { EuiDataGridProps } from '@elastic/eui';
import { InTableSearchHighlightsWrapper } from './in_table_search_highlights_wrapper';
import type { RenderCellValuePropsWithInTableSearch, RenderCellValueWrapper } from './types';

export const wrapRenderCellValueWithInTableSearchSupport = (
  renderCellValue: EuiDataGridProps['renderCellValue'],
  highlightColor: string,
  highlightBackgroundColor: string
): RenderCellValueWrapper => {
  const RenderCellValue = renderCellValue;

  return ({
    inTableSearchTerm,
    onHighlightsCountFound,
    ...props
  }: RenderCellValuePropsWithInTableSearch) => {
    return (
      <InTableSearchHighlightsWrapper
        // it's very important to have a unique key for each inTableSearchTerm change so it can add the highlights again
        key={`cell-${inTableSearchTerm || ''}`}
        inTableSearchTerm={inTableSearchTerm}
        highlightColor={highlightColor}
        highlightBackgroundColor={highlightBackgroundColor}
        onHighlightsCountFound={onHighlightsCountFound}
      >
        <RenderCellValue {...props} />
      </InTableSearchHighlightsWrapper>
    );
  };
};
