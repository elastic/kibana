/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OptionsListDSLControlState } from '@kbn/controls-schemas';
import type { DataView } from '@kbn/data-views-plugin/common';
import {
  type Filter,
  buildExistsFilter,
  buildPhraseFilter,
  buildPhrasesFilter,
} from '@kbn/es-query';

export const buildFilter = (
  dataView: DataView,
  controlId: string,
  filterState: Pick<
    OptionsListDSLControlState,
    'fieldName' | 'existsSelected' | 'exclude' | 'selectedOptions'
  > & { sectionId?: string }
) => {
  let newFilter: Filter | undefined;
  const field = dataView.getFieldByName(filterState.fieldName);
  if (field) {
    if (filterState.existsSelected) {
      newFilter = buildExistsFilter(field, dataView);
    } else if (filterState.selectedOptions && filterState.selectedOptions.length > 0) {
      newFilter =
        filterState.selectedOptions.length === 1
          ? buildPhraseFilter(field, filterState.selectedOptions[0], dataView)
          : buildPhrasesFilter(field, filterState.selectedOptions, dataView);
    }
  }
  if (newFilter) {
    newFilter.meta.key = field?.name;
    if (filterState.exclude) newFilter.meta.negate = true;
    newFilter.meta.controlledBy = controlId;
    if (filterState.sectionId) newFilter.meta.group = filterState.sectionId;
  }
  return newFilter;
};
