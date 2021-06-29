/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { escape } from 'lodash';
import cellWithFilters from './cell_with_buttons.html';
import cellWithoutFilters from './cell_without_buttons.html';

const TAGS_WITH_WS = />\s+</g;

/**
 * Remove all of the whitespace between html tags
 * so that inline elements don't have extra spaces.
 */
function noWhiteSpace(html: string): string {
  return html.replace(TAGS_WITH_WS, '><');
}

const cellWithFiltersTemplate = noWhiteSpace(cellWithFilters);
const cellWithoutFiltersTemplate = noWhiteSpace(cellWithoutFilters);

interface CellProps {
  timefield: boolean;
  sourcefield?: boolean;
  formatted: string;
  filterable: boolean;
  column: string;
}

export const cell = (props: CellProps) => {
  let classes = '';
  let extraAttrs = '';
  if (props.timefield) {
    classes = 'eui-textNoWrap';
    extraAttrs = 'width="1%"';
  } else if (props.sourcefield) {
    classes = 'eui-textBreakAll eui-textBreakWord';
  } else {
    classes = 'kbnDocTableCell__dataField eui-textBreakAll eui-textBreakWord';
  }

  if (props.filterable) {
    const escapedColumnContents = escape(props.column);
    return cellWithFiltersTemplate
      .replace('__classes__', classes)
      .replace('__extraAttrs__', extraAttrs)
      .replace('__column__', escapedColumnContents)
      .replace('__column__', escapedColumnContents)
      .replace('<formatted />', props.formatted);
  }
  return cellWithoutFiltersTemplate
    .replace('__classes__', classes)
    .replace('__extraAttrs__', extraAttrs)
    .replace('<formatted />', props.formatted);
};
