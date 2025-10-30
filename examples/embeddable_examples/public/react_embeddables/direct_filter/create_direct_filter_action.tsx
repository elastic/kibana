/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { apiCanAddNewPanel } from '@kbn/presentation-containers';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { embeddableExamplesGrouping } from '../embeddable_examples_grouping';
import { type DirectFilterState } from './get_direct_filter_embeddable_factory';
import { ADD_DIRECT_FILTER_ID, DIRECT_FILTER_TYPE } from './constants';

export const createDirectFilterAction = {
  id: ADD_DIRECT_FILTER_ID,
  grouping: [embeddableExamplesGrouping],
  getIconType: () => 'filterInclude',
  isCompatible: async ({ embeddable }: EmbeddableApiContext) => apiCanAddNewPanel(embeddable),
  execute: async ({ embeddable }: EmbeddableApiContext) => {
    if (!apiCanAddNewPanel(embeddable)) throw new IncompatibleActionError();
    embeddable.addNewPanel<DirectFilterState>({
      panelType: DIRECT_FILTER_TYPE,
    });
  },
  getDisplayName: () =>
    i18n.translate('embeddableExamples.directFilter.displayName', {
      defaultMessage: 'Direct filter',
    }),
};
