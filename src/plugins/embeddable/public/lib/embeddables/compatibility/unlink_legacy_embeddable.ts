/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import { PanelState } from '../../containers';
import { PanelNotFoundError } from '../../errors';
import { isReferenceOrValueEmbeddable } from '../../reference_or_value_embeddable';
import { ViewMode } from '../../types';
import { isErrorEmbeddable } from '../is_error_embeddable';
import { EmbeddableInput } from '../i_embeddable';
import { hasDashboardRequiredMethods } from './embeddable_compatibility_utils';
import { CommonLegacyEmbeddable } from './legacy_embeddable_to_api';

export const canUnlinkLegacyEmbeddable = async (embeddable: CommonLegacyEmbeddable) => {
  return Boolean(
    isReferenceOrValueEmbeddable(embeddable) &&
      !isErrorEmbeddable(embeddable) &&
      embeddable.getInput()?.viewMode !== ViewMode.VIEW &&
      embeddable.getRoot() &&
      embeddable.getRoot().isContainer &&
      embeddable.getRoot().type === 'dashboard' &&
      isReferenceOrValueEmbeddable(embeddable) &&
      embeddable.inputIsRefType(embeddable.getInput())
  );
};

export const unlinkLegacyEmbeddable = async (embeddable: CommonLegacyEmbeddable) => {
  const dashboard = embeddable.getRoot();
  if (
    !isReferenceOrValueEmbeddable(embeddable) ||
    !hasDashboardRequiredMethods(dashboard) ||
    !apiIsPresentationContainer(dashboard)
  ) {
    throw new IncompatibleActionError();
  }

  // unlink and update input.
  const newInput = await embeddable.getInputAsValueType();
  embeddable.updateInput(newInput);

  // replace panel in parent.
  const panelToReplace = dashboard.getInput().panels[embeddable.id] as PanelState<EmbeddableInput>;
  if (!panelToReplace) {
    throw new PanelNotFoundError();
  }
  const replacedPanelId = await dashboard.replacePanel(panelToReplace.explicitInput.id, {
    panelType: embeddable.type,
    initialState: { ...newInput, title: embeddable.getTitle() },
  });
  if (dashboard.getExpandedPanelId() !== undefined) {
    dashboard.setExpandedPanelId(replacedPanelId);
  }
};
