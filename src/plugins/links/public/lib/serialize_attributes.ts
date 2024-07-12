/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Link } from '../../common/content_management';
import { extractReferences } from '../../common/persistable_state';
import { LinksRuntimeState } from '../types';

export const serializeLinksAttributes = (
  state: LinksRuntimeState,
  shouldExtractReferences: boolean = true
) => {
  const linksToSave: Link[] | undefined = state.links?.map(
    ({ title, description, error, ...linkToSave }) => linkToSave
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
