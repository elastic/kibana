/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PresentationContainer } from '@kbn/presentation-containers';
import { BehaviorSubject } from 'rxjs';
import { DASHBOARD_LINK_TYPE, LinksAttributes } from '../../common/content_management';
import { LinksApi, ResolvedLink } from './types';

export const getMockLinksApi = ({
  attributes,
  savedObjectId,
  parentApi,
}: {
  attributes?: LinksAttributes;
  savedObjectId?: string;
  parentApi?: PresentationContainer;
}): LinksApi => {
  return {
    parentApi,
    type: 'links',
    uuid: 'mock-uuid',
    unsavedChanges: new BehaviorSubject<object | undefined>(undefined),
    resetUnsavedChanges: jest.fn(),
    serializeState: jest.fn(),
    onEdit: jest.fn(),
    isEditingEnabled: () => true,
    getTypeDisplayName: () => 'Links',
    canLinkToLibrary: async () => savedObjectId === undefined,
    canUnlinkFromLibrary: async () => savedObjectId !== undefined,
    checkForDuplicateTitle: jest.fn(),
    saveToLibrary: jest.fn(),
    getByReferenceState: jest.fn(),
    getByValueState: jest.fn(),
    attributes$: new BehaviorSubject<LinksAttributes>({
      title: 'Mock links',
      description: 'Mock links description',
      ...attributes,
    }),
    resolvedLinks$: new BehaviorSubject<ResolvedLink[]>(
      attributes?.links?.map((link, i) => ({
        ...link,
        title: link.label ?? `Link ${i}`,
        description: link.type === DASHBOARD_LINK_TYPE ? `Description ${i}` : undefined,
      })) ?? []
    ),
    savedObjectId$: new BehaviorSubject(savedObjectId),
  };
};
