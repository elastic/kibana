/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { PresentationContainer } from '@kbn/presentation-containers';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { JsSandboxPluginStartDeps } from './types';
import type { JsSandboxEmbeddableApi, JsSandboxEmbeddableState } from './register_embeddable';

interface JsSandboxActionContext extends EmbeddableApiContext {
  embeddable: JsSandboxEmbeddableApi;
}

const parentApiIsCompatible = async (
  parentApi: unknown
): Promise<PresentationContainer | undefined> => {
  const { apiIsPresentationContainer } = await import('@kbn/presentation-containers');
  // we cannot have an async type check, so return the casted parentApi rather than a boolean
  return apiIsPresentationContainer(parentApi) ? (parentApi as PresentationContainer) : undefined;
};

export function createAddJsSandboxAction(
  coreStart: CoreStart,
  pluginStart: JsSandboxPluginStartDeps
): UiActionsActionDefinition<JsSandboxActionContext> {
  return {
    id: 'create-js-sandbox-embeddable',
    grouping: [
      {
        id: 'experimental',
        getDisplayName: () =>
          i18n.translate('jsSandbox.embeddable.navMenu.groupDisplayName', {
            defaultMessage: 'Experimental',
          }),
        getIconType: () => 'logPatternAnalysis',
      },
    ],
    getIconType: () => 'logPatternAnalysis',
    getDisplayName: () =>
      i18n.translate('jsSandbox.embeddable.navMenu.embeddableDisplayName', {
        defaultMessage: 'JS Sandbox',
      }),
    async isCompatible(context: EmbeddableApiContext) {
      return Boolean(await parentApiIsCompatible(context.embeddable));
    },
    async execute(context) {
      const presentationContainerParent = await parentApiIsCompatible(context.embeddable);
      if (!presentationContainerParent) throw new IncompatibleActionError();

      try {
        const { resolveEmbeddableJsSandboxUserInput } = await import('./register_embeddable');

        const initialState: JsSandboxEmbeddableState = {
          esql: '',
          hashedJS: `function() {
        return <p>Here be dragons.</p>
      }`,
        };

        const embeddable = await presentationContainerParent.addNewPanel<
          object,
          JsSandboxEmbeddableApi
        >({
          panelType: 'js_sandbox',
          initialState,
        });

        if (!embeddable) {
          return;
        }

        const deletePanel = () => {
          presentationContainerParent.removePanel(embeddable.uuid);
        };

        resolveEmbeddableJsSandboxUserInput(
          coreStart,
          pluginStart,
          context.embeddable,
          embeddable.uuid,
          true,
          embeddable,
          deletePanel
        );
      } catch (e) {
        return Promise.reject();
      }
    },
  };
}
