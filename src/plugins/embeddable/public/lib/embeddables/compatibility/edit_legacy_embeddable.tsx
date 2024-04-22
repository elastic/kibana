/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { firstValueFrom } from 'rxjs';
import { LegacyCompatibleEmbeddable } from '../../../embeddable_panel/types';
import { core, embeddableStart } from '../../../kibana_services';
import { Container } from '../../containers';
import { EmbeddableFactoryNotFoundError } from '../../errors';
import { EmbeddableEditorState } from '../../state_transfer';
import { isExplicitInputWithAttributes } from '../embeddable_factory';
import { EmbeddableInput } from '../i_embeddable';

const getExplicitInput = (embeddable: LegacyCompatibleEmbeddable) =>
  (embeddable.getRoot() as Container)?.getInput()?.panels?.[embeddable.id]?.explicitInput ??
  embeddable.getInput();

const getAppTarget = async (embeddable: LegacyCompatibleEmbeddable) => {
  const app = embeddable ? embeddable.getOutput().editApp : undefined;
  const path = embeddable ? embeddable.getOutput().editPath : undefined;
  if (!app || !path) return;

  const currentAppId = await firstValueFrom(core.application.currentAppId$);
  if (!currentAppId) return { app, path };

  const state: EmbeddableEditorState = {
    originatingApp: currentAppId,
    valueInput: getExplicitInput(embeddable),
    embeddableId: embeddable.id,
    searchSessionId: embeddable.getInput().searchSessionId,
    originatingPath: embeddable.getAppContext()?.getCurrentPath?.(),
  };
  return { app, path, state };
};

export const editLegacyEmbeddable = async (embeddable: LegacyCompatibleEmbeddable) => {
  const { editableWithExplicitInput } = embeddable.getOutput();

  if (editableWithExplicitInput) {
    const factory = embeddableStart.getEmbeddableFactory(embeddable.type);
    if (!factory) {
      throw new EmbeddableFactoryNotFoundError(embeddable.type);
    }

    const oldExplicitInput = embeddable.getExplicitInput();
    let newExplicitInput: Partial<EmbeddableInput>;
    try {
      const explicitInputReturn = await factory.getExplicitInput(
        oldExplicitInput,
        embeddable.parent
      );
      newExplicitInput = isExplicitInputWithAttributes(explicitInputReturn)
        ? explicitInputReturn.newInput
        : explicitInputReturn;
    } catch (e) {
      // error likely means user canceled editing
      return;
    }
    embeddable.parent?.replaceEmbeddable(embeddable.id, newExplicitInput);
    return;
  }

  const appTarget = await getAppTarget(embeddable);
  const stateTransfer = embeddableStart.getStateTransfer();
  if (appTarget) {
    if (stateTransfer && appTarget.state) {
      await stateTransfer.navigateToEditor(appTarget.app, {
        path: appTarget.path,
        state: appTarget.state,
      });
    } else {
      await core.application.navigateToApp(appTarget.app, { path: appTarget.path });
    }
    return;
  }

  const href = embeddable.getOutput().editUrl;
  if (href) {
    window.location.href = href;
    return;
  }
};

export const canEditEmbeddable = (embeddable: LegacyCompatibleEmbeddable) => {
  return Boolean(
    embeddable &&
      embeddable.getInput().viewMode === 'edit' &&
      embeddable.getOutput().editable &&
      !embeddable.getOutput().inlineEditable &&
      (embeddable.getOutput().editUrl ||
        (embeddable.getOutput().editApp && embeddable.getOutput().editPath) ||
        embeddable.getOutput().editableWithExplicitInput)
  );
};
