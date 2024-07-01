/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, useMemo } from 'react';
import { EuiListGroup, EuiPanel } from '@elastic/eui';

import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import {
  initializeTitles,
  useBatchedOptionalPublishingSubjects,
} from '@kbn/presentation-publishing';

import { SerializedPanelState } from '@kbn/presentation-containers';
import { BehaviorSubject } from 'rxjs';
import { cloneDeep } from 'lodash';
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
  LinksRuntimeState,
  LinksSerializedState,
} from '../types';
import { DISPLAY_NAME } from '../../common';
import { initializeLinks } from './initialize_links';
import { injectReferences } from '../../common/persistable_state';
import { openEditorFlyout } from '../editor/open_editor_flyout';

import '../components/links_component.scss';
import { checkForDuplicateTitle, linksClient } from '../content_management';
import { resolveLinks } from '../lib/resolve_links';
import {
  deserializeLinksSavedObject,
  linksSerializeStateIsByReference,
} from '../lib/deserialize_from_library';

export const LinksContext = createContext<LinksApi | null>(null);

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
        const attributes = await deserializeLinksSavedObject(state);
        return {
          ...attributes,
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
      const { titlesApi, titleComparators, serializeTitles } = initializeTitles(state);
      const { linksApi, linksComparators, serializeLinks } = initializeLinks(state, parentApi);
      const savedObjectId$ = new BehaviorSubject(state.savedObjectId);

      const serializeState = async (): Promise<SerializedPanelState<LinksSerializedState>> => {
        const { attributes, references } = serializeLinks();
        if (savedObjectId$.value !== undefined) {
          const linksByReferenceState: LinksByReferenceSerializedState = {
            savedObjectId: savedObjectId$.value,
            ...serializeTitles(),
          };

          return { rawState: linksByReferenceState, references: [] };
        }

        const linksByValueState: LinksByValueSerializedState = {
          attributes,
          ...serializeTitles(),
        };
        return { rawState: linksByValueState, references };
      };

      const api = buildApi(
        {
          ...titlesApi,
          ...linksApi,
          libraryId$: savedObjectId$,
          savedObjectId$,
          getTypeDisplayName: () => DISPLAY_NAME,
          getByValueRuntimeSnapshot: () => {
            const snapshot = api.snapshotRuntimeState();
            delete snapshot.savedObjectId;
            return snapshot;
          },
          serializeState,
          saveToLibrary: async (newTitle: string) => {
            const { attributes, references } = await serializeLinks();
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
              const newState = await openEditorFlyout({
                initialState: state,
                parentDashboard: parentApi,
              });
              if (newState) {
                linksApi.links$.next(newState.links);
                linksApi.layout$.next(newState.layout);
              }
            } catch {
              // do nothing, user cancelled
            }
          },
        },
        {
          ...linksComparators,
          ...titleComparators,
          savedObjectId: [savedObjectId$, (val) => savedObjectId$.next(val)],
        }
      );

      const Component = () => {
        const [links, layout] = useBatchedOptionalPublishingSubjects(api.links$, api.layout$);

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
                      parentApi={api.parentApi}
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
