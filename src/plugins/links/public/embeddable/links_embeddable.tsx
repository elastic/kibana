/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep } from 'lodash';
import React, { createContext, useMemo } from 'react';
import { EuiListGroup, EuiPanel } from '@elastic/eui';

import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import {
  getUnchangingComparator,
  initializeTitles,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';

import { SerializedPanelState } from '@kbn/presentation-containers';
import {
  CONTENT_ID,
  DASHBOARD_LINK_TYPE,
  LinksAttributes,
  LINKS_HORIZONTAL_LAYOUT,
  LINKS_VERTICAL_LAYOUT,
} from '../../common/content_management';
import { DashboardLinkComponent } from '../components/dashboard_link/dashboard_link_component';
import { ExternalLinkComponent } from '../components/external_link/external_link_component';
import { LinksApi, LinksSerializedState } from './types';
import { APP_NAME } from '../../common';
import { intializeLibraryTransforms } from './initialize_library_transforms';
import { initializeLinks } from './initialize_links';
import { extractReferences, injectReferences } from '../../common/persistable_state';

import '../components/links_component.scss';

export const LinksContext = createContext<LinksApi | null>(null);

export const getLinksEmbeddableFactory = () => {
  const linksEmbeddableFactory: ReactEmbeddableFactory<LinksSerializedState, LinksApi> = {
    type: CONTENT_ID,
    deserializeState: (state) => {
      const serializedState = cloneDeep(state.rawState);
      if (serializedState === undefined) return {};

      // by-reference embeddable
      if (!('attributes' in serializedState) || serializedState.attributes === undefined) {
        return serializedState;
      }

      const { attributes: attributesWithInjectedIds } = injectReferences({
        attributes: serializedState.attributes,
        references: state.references ?? [],
      });

      return {
        ...serializedState,
        attributes: attributesWithInjectedIds,
      };
    },
    buildEmbeddable: async (state, buildApi, uuid, parentApi) => {
      const { titlesApi, titleComparators, serializeTitles } = initializeTitles(state);
      const { linksApi, linksComparators, serializeLinks } = await initializeLinks(
        state,
        uuid,
        parentApi
      );

      const serializeState = (): SerializedPanelState<LinksSerializedState> => {
        const newState = {
          ...state,
          ...serializeTitles(),
          ...serializeLinks(),
        };
        // by-reference embeddable
        if (!('attributes' in newState) || newState.attributes === undefined) {
          // No references to extract for by-reference embeddable since all references are stored with by-reference saved object
          return { rawState: newState, references: [] };
        }

        // by-value embeddable
        const { attributes, references } = extractReferences({
          attributes: newState.attributes,
        });

        return {
          rawState: { ...state, attributes },
          references,
        };
      };

      const isByReference = state.savedObjectId !== undefined;

      const api = buildApi(
        {
          ...titlesApi,
          ...linksApi,
          ...intializeLibraryTransforms(linksApi.attributes$.value, serializeState, isByReference),
          getTypeDisplayName: () => APP_NAME,
          getTypeDisplayNameLowerCase: () => 'links',
          serializeState,
        },
        {
          ...linksComparators,
          ...titleComparators,
          enhancements: getUnchangingComparator(),
          disabledActions: getUnchangingComparator(),
        }
      );

      const Component = () => {
        const [resolvedLinks, attributes] = useBatchedPublishingSubjects(
          api.resolvedLinks$,
          api.attributes$
        );

        const layout = attributes?.layout ?? LINKS_VERTICAL_LAYOUT;

        const linkItems: { [id: string]: { id: string; content: JSX.Element } } = useMemo(() => {
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
                      layout={layout}
                      api={api}
                    />
                  ) : (
                    <ExternalLinkComponent
                      key={currentLink.id}
                      link={currentLink}
                      layout={layout}
                    />
                  ),
              },
            };
          }, {});
        }, [resolvedLinks, layout]);
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
              {resolvedLinks.map((link) => linkItems[link.id].content)}
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
