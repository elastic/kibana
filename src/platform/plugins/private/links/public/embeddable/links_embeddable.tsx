/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useMemo } from 'react';
import { cloneDeep } from 'lodash';
import { BehaviorSubject } from 'rxjs';
import { EuiListGroup, EuiPanel } from '@elastic/eui';

import { PanelIncompatibleError, ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import {
  SerializedTitles,
  initializeTitleManager,
  SerializedPanelState,
  useBatchedOptionalPublishingSubjects,
} from '@kbn/presentation-publishing';

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
import { isParentApiCompatible } from '../actions/add_links_panel_action';

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
        defaultPanelTitle: attributesWithInjectedIds.title,
        defaultPanelDescription: attributesWithInjectedIds.description,
      };
    },
    buildEmbeddable: async (state, buildApi, uuid, parentApi) => {
      const blockingError$ = new BehaviorSubject<Error | undefined>(state.error);
      if (!isParentApiCompatible(parentApi)) blockingError$.next(new PanelIncompatibleError());

      const links$ = new BehaviorSubject<ResolvedLink[] | undefined>(state.links);
      const layout$ = new BehaviorSubject<LinksLayoutType | undefined>(state.layout);
      const defaultTitle$ = new BehaviorSubject<string | undefined>(state.defaultPanelTitle);
      const defaultDescription$ = new BehaviorSubject<string | undefined>(
        state.defaultPanelDescription
      );
      const savedObjectId$ = new BehaviorSubject(state.savedObjectId);
      const isByReference = Boolean(state.savedObjectId);

      const titleManager = initializeTitleManager(state);

      const serializeLinksState = (byReference: boolean, newId?: string) => {
        if (byReference) {
          const linksByReferenceState: LinksByReferenceSerializedState = {
            savedObjectId: newId ?? state.savedObjectId!,
            ...titleManager.serialize(),
          };
          return { rawState: linksByReferenceState, references: [] };
        }
        const runtimeState = api.snapshotRuntimeState();
        const { attributes, references } = serializeLinksAttributes(runtimeState);
        const linksByValueState: LinksByValueSerializedState = {
          attributes,
          ...titleManager.serialize(),
        };
        return { rawState: linksByValueState, references };
      };

      const api = buildApi(
        {
          ...titleManager.api,
          blockingError$,
          defaultTitle$,
          defaultDescription$,
          isEditingEnabled: () => Boolean(blockingError$.value === undefined),
          getTypeDisplayName: () => DISPLAY_NAME,
          serializeState: () => serializeLinksState(isByReference),
          saveToLibrary: async (newTitle: string) => {
            defaultTitle$.next(newTitle);
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
            return id;
          },
          getSerializedStateByValue: () =>
            serializeLinksState(false) as SerializedPanelState<LinksByValueSerializedState>,
          getSerializedStateByReference: (newId: string) =>
            serializeLinksState(
              true,
              newId
            ) as SerializedPanelState<LinksByReferenceSerializedState>,
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
              initialState: api.snapshotRuntimeState(),
              parentDashboard: parentApi,
            });
            if (!newState) return;

            // if the by reference state has changed during this edit, reinitialize the panel.
            const nextIsByReference = Boolean(newState?.savedObjectId);
            if (nextIsByReference !== isByReference) {
              const serializedState = serializeLinksState(
                nextIsByReference,
                newState?.savedObjectId
              );
              (serializedState.rawState as SerializedTitles).title = newState.title;

              api.parentApi?.replacePanel<LinksSerializedState>(api.uuid, {
                serializedState,
                panelType: api.type,
              });
              return;
            }
            links$.next(newState.links);
            layout$.next(newState.layout);
            defaultTitle$.next(newState.defaultPanelTitle);
            defaultDescription$.next(newState.defaultPanelDescription);
          },
        },
        {
          ...titleManager.comparators,
          links: [links$, (nextLinks?: ResolvedLink[]) => links$.next(nextLinks ?? [])],
          layout: [
            layout$,
            (nextLayout?: LinksLayoutType) => layout$.next(nextLayout ?? LINKS_VERTICAL_LAYOUT),
          ],
          error: [blockingError$, (nextError?: Error) => blockingError$.next(nextError)],
          defaultPanelDescription: [
            defaultDescription$,
            (nextDescription?: string) => defaultDescription$.next(nextDescription),
          ],
          defaultPanelTitle: [defaultTitle$, (nextTitle?: string) => defaultTitle$.next(nextTitle)],
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
            borderRadius="none"
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
