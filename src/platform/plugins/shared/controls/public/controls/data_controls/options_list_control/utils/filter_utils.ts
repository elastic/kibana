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
import { NO_ASSIGNEES_OPTION_KEY } from '../constants';

export const buildFilter = (
  dataView: DataView,
  controlId: string,
  filterState: Pick<
    OptionsListDSLControlState,
    'field_name' | 'exists_selected' | 'exclude' | 'selected_options'
  > & { sectionId?: string }
) => {
  let newFilter: Filter | undefined;
  const field = dataView.getFieldByName(filterState.field_name);
  if (field) {
    const isAssigneeField = filterState.field_name === 'kibana.alert.workflow_assignee_ids';
    const selected = filterState.selected_options ?? [];
    const hasNoAssigneesSelected = isAssigneeField && selected.includes(NO_ASSIGNEES_OPTION_KEY);
    if (hasNoAssigneesSelected) {
      const assigneeIds = selected.filter((v) => v !== NO_ASSIGNEES_OPTION_KEY);
      const should = [
        ...assigneeIds.map((id) => ({ match_phrase: { [field.name]: id } })),
        { bool: { must_not: { exists: { field: field.name } } } },
      ];
      newFilter = {
        meta: {
          alias: null,
          disabled: false,
          negate: false,
          index: dataView.id,
          type: 'custom',
          key: field.name,
          controlledBy: controlId,
          ...(filterState.sectionId ? { group: filterState.sectionId } : {}),
        },
        query: {
          bool: {
            should,
            minimum_should_match: 1,
          },
        },
      };
      return newFilter;
    }
    if (filterState.exists_selected) {
      newFilter = buildExistsFilter(field, dataView);
    } else if (filterState.selected_options && filterState.selected_options.length > 0) {
      newFilter =
        filterState.selected_options.length === 1
          ? buildPhraseFilter(field, filterState.selected_options[0], dataView)
          : buildPhrasesFilter(field, filterState.selected_options, dataView);
    }
  }
  if (newFilter) {
    newFilter.meta.key = field?.name;
    // Special-case: assignee filtering never uses negation; selecting “No assignees” is additive (OR).
    if (filterState.exclude && filterState.field_name !== 'kibana.alert.workflow_assignee_ids') {
      newFilter.meta.negate = true;
    }
    newFilter.meta.controlledBy = controlId;
    if (filterState.sectionId) newFilter.meta.group = filterState.sectionId;
  }
  return newFilter;
};
