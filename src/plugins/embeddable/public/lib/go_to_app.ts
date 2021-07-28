/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApplicationStart } from 'kibana/public';

import {
  Container,
  EmbeddableInput,
  SavedObjectEmbeddableInput,
  IEmbeddable,
  EmbeddableEditorState,
  EmbeddableStateTransfer,
} from '.';

interface GoToAppDeps {
  stateTransferService?: EmbeddableStateTransfer;
  application: ApplicationStart;
}

interface NavigationContext {
  app: string;
  path: string;
  state?: EmbeddableEditorState;
}

export async function goToApp(context: IEmbeddable, currentAppId: string, deps: GoToAppDeps) {
  const { stateTransferService, application } = deps;

  const appTarget = getAppTarget(context, currentAppId);
  if (appTarget) {
    if (stateTransferService && appTarget.state) {
      await stateTransferService.navigateToEditor(appTarget.app, {
        path: appTarget.path,
        state: appTarget.state,
      });
    } else {
      await application.navigateToApp(appTarget.app, { path: appTarget.path });
    }
    return;
  }

  const href = await getHref(context);
  if (href) {
    window.location.href = href;
    return;
  }
}

async function getHref(embeddable: IEmbeddable): Promise<string> {
  const editUrl = embeddable ? embeddable.getOutput().editUrl : undefined;
  return editUrl ? editUrl : '';
}

function getAppTarget(
  embeddable: IEmbeddable,
  currentAppId: string
): NavigationContext | undefined {
  const app = embeddable ? embeddable.getOutput().editApp : undefined;
  const path = embeddable ? embeddable.getOutput().editPath : undefined;
  if (app && path) {
    if (currentAppId) {
      const byValueMode = !(embeddable.getInput() as SavedObjectEmbeddableInput).savedObjectId;
      const state: EmbeddableEditorState = {
        originatingApp: currentAppId,
        valueInput: byValueMode ? getExplicitInput(embeddable) : undefined,
        embeddableId: embeddable.id,
      };
      return { app, path, state };
    }
    return { app, path };
  }
}

function getExplicitInput(embeddable: IEmbeddable): EmbeddableInput {
  return (
    (embeddable.getRoot() as Container)?.getInput()?.panels?.[embeddable.id]?.explicitInput ??
    embeddable.getInput()
  );
}
