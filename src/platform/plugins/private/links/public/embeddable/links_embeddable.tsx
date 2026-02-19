/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useMemo } from 'react';
import { isUndefined, omitBy } from 'lodash';
import { BehaviorSubject, map, merge } from 'rxjs';
import deepEqual from 'fast-deep-equal';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiListGroup, EuiPanel } from '@elastic/eui';

import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { PanelIncompatibleError } from '@kbn/embeddable-plugin/public';
import type { SerializedTitles } from '@kbn/presentation-publishing';
import {
  initializeTitleManager,
  useBatchedPublishingSubjects,
  titleComparators,
  apiIsPresentationContainer,
  initializeUnsavedChanges,
} from '@kbn/presentation-publishing';
import { css } from '@emotion/react';
import { openLazyFlyout } from '@kbn/presentation-util';
import type { LinksState } from '../../server';
import {
  DASHBOARD_LINK_TYPE,
  LINKS_HORIZONTAL_LAYOUT,
  LINKS_VERTICAL_LAYOUT,
} from '../../common/content_management';
import { DashboardLinkComponent } from '../components/dashboard_link/dashboard_link_component';
import { ExternalLinkComponent } from '../components/external_link/external_link_component';
import type { LinksApi, LinksParentApi, ResolvedLink } from '../types';
import type { LinksByReferenceState, LinksByValueState, LinksEmbeddableState } from '../../common';
import { DISPLAY_NAME, LINKS_EMBEDDABLE_TYPE } from '../../common';

import { checkForDuplicateTitle, linksClient } from '../content_management';
import { resolveLinks, serializeResolvedLinks } from '../lib/resolve_links';
import { isParentApiCompatible } from '../actions/add_links_panel_action';
import { coreServices } from '../services/kibana_services';
import { loadFromLibrary } from '../content_management/load_from_library';

export const LinksContext = createContext<LinksApi | null>(null);

export const getLinksEmbeddableFactory = () => {
  const linksEmbeddableFactory: EmbeddableFactory<LinksEmbeddableState, LinksApi> = {
    type: LINKS_EMBEDDABLE_TYPE,
    buildEmbeddable: async ({ initialState, finalizeApi, uuid, parentApi }) => {
      const titleManager = initializeTitleManager(initialState);

      const savedObjectId = (initialState as LinksByReferenceState).savedObjectId;
      const intialLinksState = savedObjectId
        ? await loadFromLibrary(savedObjectId)
        : (initialState as LinksState);

      const isByReference = savedObjectId !== undefined;

      const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);
      if (!isParentApiCompatible(parentApi)) blockingError$.next(new PanelIncompatibleError());

      const defaultDescription$ = new BehaviorSubject(
        isByReference ? intialLinksState.description : undefined
      );
      const defaultTitle$ = new BehaviorSubject(isByReference ? intialLinksState.title : undefined);
      const layout$ = new BehaviorSubject(intialLinksState.layout);
      const resolvedLinks$ = new BehaviorSubject<ResolvedLink[]>(
        await resolveLinks(intialLinksState.links ?? [])
      );

      function serializeByReference(libraryId: string) {
        return {
          ...titleManager.getLatestState(),
          savedObjectId: libraryId,
        };
      }

      function serializeByValue() {
        return {
          ...titleManager.getLatestState(),
          layout: layout$.getValue(),
          links: serializeResolvedLinks(resolvedLinks$.getValue()),
        };
      }

      const serializeState = () =>
        isByReference ? serializeByReference(savedObjectId) : serializeByValue();

      const unsavedChangesApi = initializeUnsavedChanges<LinksEmbeddableState>({
        uuid,
        parentApi,
        serializeState,
        anyStateChange$: merge(
          titleManager.anyStateChange$,
          layout$.pipe(map(() => undefined)),
          resolvedLinks$.pipe(map(() => undefined))
        ),
        getComparators: () => {
          return {
            ...titleComparators,
            layout: isByReference ? 'skip' : 'referenceEquality',
            links: isByReference
              ? 'skip'
              : (aLinks, bLinks) => {
                  if (aLinks?.length !== bLinks?.length) {
                    return false;
                  }

                  const hasLinkDifference = (aLinks ?? []).some((linkFromA, index) => {
                    const linkFromB = bLinks?.[index];
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
          titleManager.reinitializeState(lastSaved);
          if (!savedObjectId) {
            layout$.next((lastSaved as LinksByValueState)?.layout);
            resolvedLinks$.next(await resolveLinks((lastSaved as LinksByValueState)?.links ?? []));
          }
        },
      });

      const api = finalizeApi({
        ...titleManager.api,
        ...unsavedChangesApi,
        blockingError$,
        defaultTitle$,
        defaultDescription$,
        isEditingEnabled: () => Boolean(blockingError$.value === undefined),
        getTypeDisplayName: () => DISPLAY_NAME,
        serializeState,
        saveToLibrary: async (newTitle: string) => {
          defaultTitle$.next(newTitle);
          const {
            item: { id },
          } = await linksClient.create({
            data: {
              layout: layout$.getValue(),
              links: serializeResolvedLinks(resolvedLinks$.getValue()),
              title: newTitle,
            },
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
          openLazyFlyout({
            core: coreServices,
            parentApi,
            loadContent: async ({ closeFlyout }) => {
              const { getEditorFlyout } = await import('../editor/get_editor_flyout');
              return getEditorFlyout({
                initialState: {
                  description:
                    titleManager.api.description$.getValue() ?? defaultDescription$.getValue(),
                  layout: layout$.getValue(),
                  links: resolvedLinks$.getValue(),
                  title: titleManager.api.title$.getValue() ?? defaultTitle$.getValue(),
                  savedObjectId,
                },
                parentDashboard: parentApi,
                onCompleteEdit: async (newState) => {
                  if (!newState) return;

                  // if the by reference state has changed during this edit, reinitialize the panel.
                  const nextSavedObjectId = newState?.savedObjectId;
                  const nextIsByReference = nextSavedObjectId !== undefined;
                  if (
                    nextIsByReference !== isByReference &&
                    apiIsPresentationContainer(api.parentApi)
                  ) {
                    const serializedState = nextIsByReference
                      ? serializeByReference(nextSavedObjectId)
                      : serializeByValue();
                    (serializedState as SerializedTitles).title = newState.title;

                    api.parentApi.replacePanel<LinksEmbeddableState>(api.uuid, {
                      serializedState,
                      panelType: api.type,
                    });
                    return;
                  }

                  defaultDescription$.next(newState.description);
                  defaultTitle$.next(newState.title);
                  layout$.next(newState.layout);
                  resolvedLinks$.next(newState.links ?? []);
                },
                closeFlyout,
              });
            },
            flyoutProps: {
              'data-test-subj': 'links--panelEditor--flyout',
            },
          });
        },
      });

      const Component = () => {
        const [resolvedLinks, layout] = useBatchedPublishingSubjects(resolvedLinks$, layout$);

        const linkItems: { [id: string]: { id: string; content: JSX.Element } } = useMemo(() => {
          if (!resolvedLinks) return {};
          return resolvedLinks.reduce((prev, currentLink) => {
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
        }, [resolvedLinks, layout]);
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
              {resolvedLinks?.map((link) => linkItems[link.id].content)}
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
