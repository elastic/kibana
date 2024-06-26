/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { loadFromLibrary } from '../content_management';
import { LinksByReferenceSerializedState, LinksSerializedState } from '../types';
import { resolveLinks } from './resolve_links';

export const linksSerializeStateIsByReference = (
  state?: LinksSerializedState
): state is LinksByReferenceSerializedState => {
  return Boolean(state && (state as LinksByReferenceSerializedState).savedObjectId !== undefined);
};

export const deserializeLinksSavedObject = async (state: LinksByReferenceSerializedState) => {
  const { attributes } = await loadFromLibrary(state.savedObjectId);

  const links = await resolveLinks(attributes.links ?? []);

  const { title: defaultPanelTitle, description: defaultPanelDescription, layout } = attributes;

  return {
    links,
    layout,
    savedObjectId: state.savedObjectId,
    defaultPanelTitle,
    defaultPanelDescription,
  };
};
