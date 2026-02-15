/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { PublicTriggerDefinition } from '@kbn/workflows-extensions/public';
import {
  ENTITY_UPDATED_TRIGGER_ID,
  entityUpdatedTriggerEventSchema,
} from '../../common/triggers/entity_updated_trigger';

export const entityUpdatedTriggerPublicDefinition: PublicTriggerDefinition<
  typeof entityUpdatedTriggerEventSchema
> = {
  id: ENTITY_UPDATED_TRIGGER_ID,
  title: i18n.translate('workflowsExtensionsExample.entityUpdated.title', {
    defaultMessage: 'Entity updated',
  }),
  description: i18n.translate('workflowsExtensionsExample.entityUpdated.description', {
    defaultMessage: 'Emitted when an entity is updated.',
  }),
  eventSchema: entityUpdatedTriggerEventSchema,
};
