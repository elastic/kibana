/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LegacyCompatibleEmbeddable } from '../../../embeddable_panel/types';
import { core, embeddableStart } from '../../../kibana_services';
import { Container } from '../../containers';
import { navigateToEditor } from '../../editable_embeddable';
import { EmbeddableFactoryNotFoundError } from '../../errors';
import { isExplicitInputWithAttributes } from '../embeddable_factory';
import { EmbeddableInput } from '../i_embeddable';

const getExplicitInput = (embeddable: LegacyCompatibleEmbeddable) =>
  (embeddable.getRoot() as Container)?.getInput()?.panels?.[embeddable.id]?.explicitInput ??
  embeddable.getInput();

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

  await navigateToEditor(
    { core, embeddable: embeddableStart },
    {
      ...embeddable,
      serializeState: () => ({
        rawState: getExplicitInput(embeddable),
      }),
      getEditorAppTarget: () =>
        Promise.resolve({
          editPath: embeddable.getOutput().editPath,
          editApp: embeddable.getOutput().editApp,
          editUrl: embeddable.getOutput().editUrl,
        }),
    }
  );
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
