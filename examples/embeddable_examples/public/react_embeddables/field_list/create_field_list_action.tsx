/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { apiCanAddNewPanel } from '@kbn/presentation-publishing';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { embeddableExamplesGrouping } from '../embeddable_examples_grouping';
import { ADD_FIELD_LIST_ACTION_ID, FIELD_LIST_ID } from './constants';
import type { FieldListSerializedState } from './types';

export const createFieldListAction = {
  id: ADD_FIELD_LIST_ACTION_ID,
  grouping: [embeddableExamplesGrouping],
  getIconType: () => 'indexOpen',
  isCompatible: async ({ embeddable }: EmbeddableApiContext) => {
    return apiCanAddNewPanel(embeddable);
  },
  execute: async ({ embeddable }: EmbeddableApiContext) => {
    if (!apiCanAddNewPanel(embeddable)) throw new IncompatibleActionError();
    embeddable.addNewPanel<FieldListSerializedState>({
      panelType: FIELD_LIST_ID,
    });
  },
  getDisplayName: () =>
    i18n.translate('embeddableExamples.unifiedFieldList.displayName', {
      defaultMessage: 'Field list',
    }),
};
