/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, useMemo } from 'react';
import { cloneDeep } from 'lodash';
import { BehaviorSubject } from 'rxjs';
import fastIsEqual from 'fast-deep-equal';
import { EuiListGroup, EuiPanel } from '@elastic/eui';

import { PanelIncompatibleError, ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import {
  apiPublishesPanelDescription,
  apiPublishesPanelTitle,
  apiPublishesSavedObjectId,
  initializeTitles,
  useBatchedOptionalPublishingSubjects,
} from '@kbn/presentation-publishing';

import { apiIsPresentationContainer, SerializedPanelState } from '@kbn/presentation-containers';

import {
  CONTENT_ID,
  DASHBOARD_LINK_TYPE,
  LinksLayoutType,
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
  ResolvedLink,
} from '../types';
import { DISPLAY_NAME } from '../../common';
import { injectReferences } from '../../common/persistable_state';

import '../components/links_component.scss';
import { checkForDuplicateTitle, linksClient } from '../content_management';
import { resolveLinks } from '../lib/resolve_links';
import {
  deserializeLinksSavedObject,
  linksSerializeStateIsByReference,
} from '../lib/deserialize_from_library';
import { serializeLinksAttributes } from '../lib/serialize_attributes';

export const LinksContext = createContext<LinksApi | null>(null);

const isParentApiCompatible = (parentApi: unknown): parentApi is LinksParentApi =>
  apiIsPresentationContainer(parentApi) &&
  apiPublishesSavedObjectId(parentApi) &&
  apiPublishesPanelTitle(parentApi) &&
  apiPublishesPanelDescription(parentApi);

export const getLinksEmbeddableFactory = () => {
  const linksEmbeddableFactory: ReactEmbeddableFactory<
    LinksSerializedState,
    LinksRuntimeState,
    LinksApi
  > = {
    type: CONTENT_ID,
    deserializeState: async (serializedState) => {
      // Clone the state to avoid an object not extensible error when injecting references
      const state = cloneDeep(serializedState.rawState);
      const { title, description } = serializedState.rawState;

      if (linksSerializeStateIsByReference(state)) {
        const linksSavedObject = await linksClient.get(state.savedObjectId);
        const runtimeState = await deserializeLinksSavedObject(linksSavedObject.item);
        return {
          ...runtimeState,
          title,
          description,
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
        links: resolvedLinks,
        layout: attributesWithInjectedIds.layout,
        defaultPanelTitle: attributesWithInjectedIds.title,
        defaultPanelDescription: attributesWithInjectedIds.description,
      };
    },
    buildEmbeddable: async (state, buildApi, uuid, parentApi) => {
      const error$ = new BehaviorSubject<Error | undefined>(state.error);
      if (!isParentApiCompatible(parentApi)) error$.next(new PanelIncompatibleError());

      const links$ = new BehaviorSubject<ResolvedLink[] | undefined>(state.links);
      const layout$ = new BehaviorSubject<LinksLayoutType | undefined>(state.layout);
      const defaultPanelTitle = new BehaviorSubject<string | undefined>(state.defaultPanelTitle);
      const defaultPanelDescription = new BehaviorSubject<string | undefined>(
        state.defaultPanelDescription
      );
      const savedObjectId$ = new BehaviorSubject(state.savedObjectId);
      const { titlesApi, titleComparators, serializeTitles } = initializeTitles(state);

      const api = buildApi(
        {
          ...titlesApi,
          blockingError: error$,
          defaultPanelTitle,
          defaultPanelDescription,
          isEditingEnabled: () => Boolean(error$.value === undefined),
          libraryId$: savedObjectId$,
          getTypeDisplayName: () => DISPLAY_NAME,
          getByValueRuntimeSnapshot: () => {
            const snapshot = api.snapshotRuntimeState();
            delete snapshot.savedObjectId;
            return snapshot;
          },
          serializeState: async (): Promise<SerializedPanelState<LinksSerializedState>> => {
            if (savedObjectId$.value !== undefined) {
              const linksByReferenceState: LinksByReferenceSerializedState = {
                savedObjectId: savedObjectId$.value,
                ...serializeTitles(),
              };
              return { rawState: linksByReferenceState, references: [] };
            }
            const runtimeState = api.snapshotRuntimeState();
            const { attributes, references } = serializeLinksAttributes(runtimeState);
            const linksByValueState: LinksByValueSerializedState = {
              attributes,
              ...serializeTitles(),
            };
            return { rawState: linksByValueState, references };
          },
          saveToLibrary: async (newTitle: string) => {
            defaultPanelTitle.next(newTitle);
            const runtimeState = api.snapshotRuntimeState();
            const { attributes, references } = serializeLinksAttributes(runtimeState);
            const {
              item: { id },
            } = await linksClient.create({
              data: {
                ...attributes,
                title: newTitle,
              },
              options: { references },
            });
            savedObjectId$.next(id);
            return id;
          },
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
          unlinkFromLibrary: () => {
            savedObjectId$.next(undefined);
          },
          onEdit: async () => {
            try {
              const { openEditorFlyout } = await import('../editor/open_editor_flyout');
              const newState = await openEditorFlyout({
                initialState: api.snapshotRuntimeState(),
                parentDashboard: parentApi,
              });
              if (newState) {
                links$.next(newState.links);
                layout$.next(newState.layout);
                defaultPanelTitle.next(newState.defaultPanelTitle);
                defaultPanelDescription.next(newState.defaultPanelDescription);
                savedObjectId$.next(newState.savedObjectId);
              }
            } catch {
              // do nothing, user cancelled
            }
          },
        },
        {
          ...titleComparators,
          links: [
            links$,
            (nextLinks?: ResolvedLink[]) => links$.next(nextLinks ?? []),
            (a, b) => Boolean(savedObjectId$.value) || fastIsEqual(a, b), // Editing attributes in a by-reference panel should not trigger unsaved changes.
          ],
          layout: [
            layout$,
            (nextLayout?: LinksLayoutType) => layout$.next(nextLayout ?? LINKS_VERTICAL_LAYOUT),
            (a, b) => Boolean(savedObjectId$.value) || a === b,
          ],
          error: [error$, (nextError?: Error) => error$.next(nextError)],
          defaultPanelDescription: [
            defaultPanelDescription,
            (nextDescription?: string) => defaultPanelDescription.next(nextDescription),
          ],
          defaultPanelTitle: [
            defaultPanelTitle,
            (nextTitle?: string) => defaultPanelTitle.next(nextTitle),
          ],
          savedObjectId: [savedObjectId$, (val) => savedObjectId$.next(val)],
        }
      );

      const Component = () => {
        const [links, layout] = useBatchedOptionalPublishingSubjects(links$, layout$);

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
            className={`linksComponent ${
              layout === LINKS_HORIZONTAL_LAYOUT ? 'eui-xScroll' : 'eui-yScroll'
            }`}
            paddingSize="xs"
            data-shared-item
            data-rendering-count={1}
            data-test-subj="links--component"
          >
            <EuiListGroup
              maxWidth={false}
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
