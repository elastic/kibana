/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Link } from '../../common/content_management';
import { extractReferences } from '../../common/persistable_state';
import { LinksRuntimeState } from '../types';

export const serializeLinksAttributes = (
  state: LinksRuntimeState,
  shouldExtractReferences: boolean = true
) => {
  const linksToSave: Link[] | undefined = state.links
    ?.map(({ title, description, error, ...linkToSave }) => linkToSave)
    ?.map(
      // fiilter out null values which may have been introduced by the session state backup (undefined values are serialized as null).
      (link) =>
        Object.fromEntries(
          Object.entries(link).filter(([key, value]) => value !== null)
        ) as unknown as Link
    );
  const attributes = {
    title: state.defaultPanelTitle,
    description: state.defaultPanelDescription,
    layout: state.layout,
    links: linksToSave,
  };

  const serializedState = shouldExtractReferences
    ? extractReferences({ attributes })
    : { attributes, references: [] };

  return serializedState;
};
