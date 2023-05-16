/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { NavigationNode } from './types';

export const useInitNavnode = ({ id: _id, link, title: _title = '' }: NavigationNode) => {
  const id = _id ?? link;

  let title = _title;
  if (title.trim().length === 0) {
    if (!link) {
      throw new Error(`Title prop missing for navigation item [${id}]`);
    }
    // TODO: read title from deeplink id
    title = '<todo from deeplink>';
  }

  if (!id) {
    throw new Error(`Id or link prop missing for navigation item [${title}]`);
  }

  // Here we'll have the logic to retrive deeplink info (href, title, etc.) from Chrome service

  return {
    id,
    title,
  };
};
