/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { EmbeddableApiContext, PublishesEsqlUsage } from '@kbn/presentation-publishing';
import { apiPublishesEsqlUsage } from '@kbn/presentation-publishing';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import { APPROXIMATION_APPLIED_BADGE } from './constants';

export type ApproximationAppliedBadgeApi = Pick<PublishesEsqlUsage, 'approximationApplied$'>;

const isApiCompatible = (api: unknown | null): api is ApproximationAppliedBadgeApi =>
  apiPublishesEsqlUsage(api);

export const approximationAppliedBadge: ActionDefinition<EmbeddableApiContext> = {
  id: APPROXIMATION_APPLIED_BADGE,
  type: APPROXIMATION_APPLIED_BADGE,
  order: 10,
  getIconType: () => 'approximate',
  getDisplayName: ({ embeddable }: EmbeddableApiContext) => {
    if (!isApiCompatible(embeddable)) throw new IncompatibleActionError();
    return i18n.translate('embeddableApi.badge.approximationApplied.displayName', {
      defaultMessage: 'Approximation applied',
    });
  },
  isCompatible: async ({ embeddable }: EmbeddableApiContext) => {
    return isApiCompatible(embeddable);
  },
  execute: async ({ embeddable }: EmbeddableApiContext) => {
    return;
  },
};
