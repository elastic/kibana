/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import { IContainer, PanelState } from '../../containers';
import { PanelNotFoundError } from '../../errors';
import { isReferenceOrValueEmbeddable } from '../../reference_or_value_embeddable';
import { ViewMode } from '../../types';
import { isErrorEmbeddable } from '../is_error_embeddable';
import { EmbeddableInput } from '../i_embeddable';
import { CommonLegacyEmbeddable } from './legacy_embeddable_to_api';

export const canUnlinkLegacyEmbeddable = async (embeddable: CommonLegacyEmbeddable) => {
  return Boolean(
    isReferenceOrValueEmbeddable(embeddable) &&
      !isErrorEmbeddable(embeddable) &&
      embeddable.getInput()?.viewMode !== ViewMode.VIEW &&
      embeddable.getRoot() &&
      embeddable.getRoot().isContainer &&
      embeddable.inputIsRefType(embeddable.getInput())
  );
};

export const unlinkLegacyEmbeddable = async (embeddable: CommonLegacyEmbeddable) => {
  const root = embeddable.getRoot() as IContainer;
  if (!isReferenceOrValueEmbeddable(embeddable) || !apiIsPresentationContainer(root)) {
    throw new IncompatibleActionError();
  }

  // unlink and update input.
  const newInput = await embeddable.getInputAsValueType();
  embeddable.updateInput(newInput);

  // replace panel in parent.
  const panelToReplace = root.getInput().panels[embeddable.id] as PanelState<EmbeddableInput>;
  if (!panelToReplace) {
    throw new PanelNotFoundError();
  }
  await root.replacePanel(panelToReplace.explicitInput.id, {
    panelType: embeddable.type,
    serializedState: { ...newInput, title: embeddable.getTitle() },
  });
};
