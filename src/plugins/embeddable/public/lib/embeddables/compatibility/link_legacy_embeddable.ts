/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery } from '@kbn/es-query';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import { core } from '../../../kibana_services';
import { PanelNotFoundError } from '../../errors';
import { isFilterableEmbeddable } from '../../filterable_embeddable';
import { isReferenceOrValueEmbeddable } from '../../reference_or_value_embeddable';
import { isErrorEmbeddable } from '../is_error_embeddable';
import { CommonLegacyEmbeddable } from './legacy_embeddable_to_api';
import { IContainer } from '../../containers';

export const canLinkLegacyEmbeddable = async (embeddable: CommonLegacyEmbeddable) => {
  // linking and unlinking legacy embeddables is only supported on Dashboard
  if (
    isErrorEmbeddable(embeddable) ||
    !(embeddable.getRoot() && embeddable.getRoot().isContainer) ||
    !isReferenceOrValueEmbeddable(embeddable)
  ) {
    return false;
  }

  const { visualize } = core.application.capabilities;
  const canSave = visualize.save;

  const { isOfAggregateQueryType } = await import('@kbn/es-query');
  const query = isFilterableEmbeddable(embeddable) && embeddable.getQuery();

  // Textbased panels (i.e. ES|QL) should not save to library
  const isTextBasedEmbeddable = isOfAggregateQueryType(query as AggregateQuery);

  return Boolean(
    canSave &&
      isReferenceOrValueEmbeddable(embeddable) &&
      !embeddable.inputIsRefType(embeddable.getInput()) &&
      !isTextBasedEmbeddable
  );
};

export const linkLegacyEmbeddable = async (embeddable: CommonLegacyEmbeddable) => {
  const root = embeddable.getRoot() as IContainer;
  if (!isReferenceOrValueEmbeddable(embeddable) || !apiIsPresentationContainer(root)) {
    throw new IncompatibleActionError();
  }

  // Link to library
  const newInput = await embeddable.getInputAsRefType();
  embeddable.updateInput(newInput);

  // Replace panel in parent.
  const panelToReplace = root.getInput().panels[embeddable.id];
  if (!panelToReplace) {
    throw new PanelNotFoundError();
  }
  await root.replacePanel(panelToReplace.explicitInput.id, {
    panelType: embeddable.type,
    serializedState: { ...newInput },
  });
};
