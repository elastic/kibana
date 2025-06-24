/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useMemo } from 'react';
import { cloneDeep, isUndefined, omitBy } from 'lodash';
import { BehaviorSubject, merge } from 'rxjs';
import deepEqual from 'fast-deep-equal';
import { EuiListGroup, EuiPanel, UseEuiTheme } from '@elastic/eui';

import { PanelIncompatibleError, EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import {
  SerializedTitles,
  initializeTitleManager,
  SerializedPanelState,
  useBatchedPublishingSubjects,
  initializeStateManager,
  titleComparators,
} from '@kbn/presentation-publishing';
import { css } from '@emotion/react';

import { apiIsPresentationContainer, initializeUnsavedChanges } from '@kbn/presentation-containers';
import {
  CONTENT_ID,
  DASHBOARD_LINK_TYPE,
  LINKS_HORIZONTAL_LAYOUT,
  LINKS_VERTICAL_LAYOUT,
} from '../../common/content_management';
import { DashboardLinkComponent } from '../components/dashboard_link/dashboard_link_component';
import { ExternalLinkComponent } from '../components/external_link/external_link_component';
import {
  LinksApi,
  LinksByReferenceSerializedState,
  LinksByValueSerializedState,
  LinksParentApi,
  LinksRuntimeState,
  LinksSerializedState,
} from '../types';
import { DISPLAY_NAME } from '../../common';
import { injectReferences } from '../../common/persistable_state';

import { checkForDuplicateTitle, linksClient } from '../content_management';
import { resolveLinks } from '../lib/resolve_links';
import {
  deserializeLinksSavedObject,
  linksSerializeStateIsByReference,
} from '../lib/deserialize_from_library';
import { serializeLinksAttributes } from '../lib/serialize_attributes';
import { isParentApiCompatible } from '../actions/add_links_panel_action';

export const LinksContext = createContext<LinksApi | null>(null);

export async function deserializeState(
  serializedState: SerializedPanelState<LinksSerializedState>
) {
  // Clone the state to avoid an object not extensible error when injecting references
  const state = cloneDeep(serializedState.rawState);
  const { title, description, hidePanelTitles } = serializedState.rawState;

  if (linksSerializeStateIsByReference(state)) {
    const linksSavedObject = await linksClient.get(state.savedObjectId);
    const runtimeState = await deserializeLinksSavedObject(linksSavedObject.item);
    return {
      ...runtimeState,
      title,
      description,
      hidePanelTitles,
    };
  }

  const { attributes: attributesWithInjectedIds } = injectReferences({
    attributes: state.attributes,
    references: serializedState.references ?? [],
  });

  const resolvedLinks = await resolveLinks(attributesWithInjectedIds.links ?? []);

  return {
    title,
    description,
    hidePanelTitles,
    links: resolvedLinks,
    layout: attributesWithInjectedIds.layout,
    defaultTitle: attributesWithInjectedIds.title,
    defaultDescription: attributesWithInjectedIds.description,
  };
}

export const getLinksEmbeddableFactory = () => {
  const linksEmbeddableFactory: EmbeddableFactory<LinksSerializedState, LinksApi> = {
    type: CONTENT_ID,
    buildEmbeddable: async ({ initialState, finalizeApi, uuid, parentApi }) => {
      const titleManager = initializeTitleManager(initialState.rawState);
      const savedObjectId = linksSerializeStateIsByReference(initialState.rawState)
        ? initialState.rawState.savedObjectId
        : undefined;
      const isByReference = savedObjectId !== undefined;

      const initialRuntimeState = await deserializeState(initialState);

      const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);
      if (!isParentApiCompatible(parentApi)) blockingError$.next(new PanelIncompatibleError());

      const stateManager = initializeStateManager<
        Pick<LinksRuntimeState, 'defaultDescription' | 'defaultTitle' | 'layout' | 'links'>
      >(initialRuntimeState, {
        defaultDescription: undefined,
        defaultTitle: undefined,
        layout: undefined,
        links: undefined,
      });

      function serializeByReference(id: string) {
        return {
          rawState: {
            ...titleManager.getLatestState(),
            savedObjectId: id,
          } as LinksByReferenceSerializedState,
          references: [],
        };
      }

      function serializeByValue() {
        const { attributes, references } = serializeLinksAttributes(stateManager.getLatestState());
        return {
          rawState: {
            ...titleManager.getLatestState(),
            attributes,
          } as LinksByValueSerializedState,
          references,
        };
      }

      const serializeState = () =>
        isByReference ? serializeByReference(savedObjectId) : serializeByValue();

      const unsavedChangesApi = initializeUnsavedChanges<LinksSerializedState>({
        uuid,
        parentApi,
        serializeState,
        anyStateChange$: merge(titleManager.anyStateChange$, stateManager.anyStateChange$),
        getComparators: () => {
          return {
            ...titleComparators,
            attributes: isByReference
              ? 'skip'
              : (
                  a?: LinksByValueSerializedState['attributes'],
                  b?: LinksByValueSerializedState['attributes']
                ) => {
                  if (
                    a?.title !== b?.title ||
                    a?.description !== b?.description ||
                    a?.layout !== b?.layout ||
                    a?.links?.length !== b?.links?.length
                  ) {
                    return false;
                  }

                  const hasLinkDifference = (a?.links ?? []).some((linkFromA, index) => {
                    const linkFromB = b?.links?.[index];
                    return !deepEqual(
                      omitBy(linkFromA, isUndefined),
                      omitBy(linkFromB, isUndefined)
                    );
                  });
                  return !hasLinkDifference;
                },
            savedObjectId: 'skip',
          };
        },
        onReset: async (lastSaved) => {
          titleManager.reinitializeState(lastSaved?.rawState);
          if (lastSaved && !isByReference) {
            const lastSavedRuntimeState = await deserializeState(lastSaved);
            stateManager.reinitializeState(lastSavedRuntimeState);
          }
        },
      });

      const api = finalizeApi({
        ...titleManager.api,
        ...unsavedChangesApi,
        blockingError$,
        defaultTitle$: stateManager.api.defaultTitle$,
        defaultDescription$: stateManager.api.defaultDescription$,
        isEditingEnabled: () => Boolean(blockingError$.value === undefined),
        getTypeDisplayName: () => DISPLAY_NAME,
        serializeState,
        saveToLibrary: async (newTitle: string) => {
          stateManager.api.setDefaultTitle(newTitle);
          const { attributes, references } = serializeLinksAttributes(
            stateManager.getLatestState()
          );
          const {
            item: { id },
          } = await linksClient.create({
            data: {
              ...attributes,
              title: newTitle,
            },
            options: { references },
          });
          return id;
        },
        getSerializedStateByValue: serializeByValue,
        getSerializedStateByReference: serializeByReference,
        canLinkToLibrary: async () => !isByReference,
        canUnlinkFromLibrary: async () => isByReference,
        checkForDuplicateTitle: async (
          newTitle: string,
          isTitleDuplicateConfirmed: boolean,
          onTitleDuplicate: () => void
        ) => {
          await checkForDuplicateTitle({
            title: newTitle,
            copyOnSave: false,
            lastSavedTitle: '',
            isTitleDuplicateConfirmed,
            onTitleDuplicate,
          });
        },
        onEdit: async () => {
          const { openEditorFlyout } = await import('../editor/open_editor_flyout');
          const newState = await openEditorFlyout({
            initialState: {
              ...stateManager.getLatestState(),
              savedObjectId,
            },
            parentDashboard: parentApi,
          });
          if (!newState) return;

          // if the by reference state has changed during this edit, reinitialize the panel.
          const nextSavedObjectId = newState?.savedObjectId;
          const nextIsByReference = nextSavedObjectId !== undefined;
          if (nextIsByReference !== isByReference && apiIsPresentationContainer(api.parentApi)) {
            const serializedState = nextIsByReference
              ? serializeByReference(nextSavedObjectId)
              : serializeByValue();
            (serializedState.rawState as SerializedTitles).title = newState.title;

            api.parentApi.replacePanel<LinksSerializedState>(api.uuid, {
              serializedState,
              panelType: api.type,
            });
            return;
          }

          stateManager.reinitializeState(newState);
        },
      });

      const Component = () => {
        const [links, layout] = useBatchedPublishingSubjects(
          stateManager.api.links$,
          stateManager.api.layout$
        );

        const linkItems: { [id: string]: { id: string; content: JSX.Element } } = useMemo(() => {
          if (!links) return {};
          return links.reduce((prev, currentLink) => {
            return {
              ...prev,
              [currentLink.id]: {
                id: currentLink.id,
                content:
                  currentLink.type === DASHBOARD_LINK_TYPE ? (
                    <DashboardLinkComponent
                      key={currentLink.id}
                      link={currentLink}
                      layout={layout ?? LINKS_VERTICAL_LAYOUT}
                      parentApi={parentApi as LinksParentApi}
                    />
                  ) : (
                    <ExternalLinkComponent
                      key={currentLink.id}
                      link={currentLink}
                      layout={layout ?? LINKS_VERTICAL_LAYOUT}
                    />
                  ),
              },
            };
          }, {});
        }, [links, layout]);
        return (
          <EuiPanel
            className={layout === LINKS_HORIZONTAL_LAYOUT ? 'eui-xScroll' : 'eui-yScroll'}
            paddingSize="xs"
            data-shared-item
            data-rendering-count={1}
            data-test-subj="links--component"
            borderRadius="none"
          >
            <EuiListGroup
              maxWidth={false}
              css={styles}
              className={`${layout ?? LINKS_VERTICAL_LAYOUT}LayoutWrapper`}
              data-test-subj="links--component--listGroup"
            >
              {links?.map((link) => linkItems[link.id].content)}
            </EuiListGroup>
          </EuiPanel>
        );
      };
      return {
        api,
        Component,
      };
    },
  };
  return linksEmbeddableFactory;
};

const styles = ({ euiTheme }: UseEuiTheme) =>
  css({
    '.linksPanelLink': {
      maxWidth: 'fit-content', // ensures that the error tooltip shows up **right beside** the link label
    },
    '&.verticalLayoutWrapper': {
      gap: euiTheme.size.xs,
    },
    '&.horizontalLayoutWrapper': {
      height: '100%',
      display: 'flex',
      flexWrap: 'nowrap',
      alignItems: 'center',
      flexDirection: 'row',
    },
  });
