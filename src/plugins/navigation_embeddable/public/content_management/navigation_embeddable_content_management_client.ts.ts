/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { v4 as uuidv4 } from 'uuid';
import type { SearchQuery } from '@kbn/content-management-plugin/common';
import type { NavigationEmbeddableCrudTypes } from '../../common/content_management';
import { CONTENT_ID as contentTypeId } from '../../common';
import { contentManagement } from '../services/kibana_services';
import { NavigationEmbeddableLink } from '../../common/types';

export interface NavigationEmbeddableLinksMap {
  [key: string]: NavigationEmbeddableLink;
}

const get = async (id: string) => {
  return contentManagement.client.get({ contentTypeId, id });
};

const loadNavigationEmbeddableState = async ({ id }: { id: string }) => {
  const embeddableId = uuidv4();

  const { item: rawNavigationEmbeddableContent, meta: resolveMeta } =
    await contentManagement.client.get<
      NavigationEmbeddableCrudTypes['GetIn'],
      NavigationEmbeddableCrudTypes['GetOut']
    >({ contentTypeId, id });

  /**
   * Inject saved object references back into the saved object attributes
   */
  const { references, attributes: rawAttributes } = rawNavigationEmbeddableContent;
  const attributes = (() => {
    // TODO inject references
    return rawAttributes;
  })();

  const { description, linksJSON, title } = attributes;

  /**
   * Parse links from JSON
   */
  const links: NavigationEmbeddableLink[] = linksJSON ? JSON.parse(linksJSON) : undefined;
  const linksMap: NavigationEmbeddableLinksMap = {};
  links.forEach((link, idx) => {
    linksMap[String(idx)] = link;
  });

  return {
    resolveMeta,
    navigationEmbeddableFound: true,
    navigationEmbeddableId: id,
    navigationEmbeddableInput: {
      id: embeddableId,
      title,
      description,
      links: linksMap,
    },
  };
};

const create = async ({
  data,
  options,
}: Omit<NavigationEmbeddableCrudTypes['CreateIn'], 'contentTypeId'>) => {
  const { item } = await contentManagement.client.create<
    NavigationEmbeddableCrudTypes['CreateIn'],
    NavigationEmbeddableCrudTypes['CreateOut']
  >({
    contentTypeId,
    data,
    options,
  });
  return item;
};

const update = async ({
  id,
  data,
  options,
}: Omit<NavigationEmbeddableCrudTypes['UpdateIn'], 'contentTypeId'>) => {
  const res = await contentManagement.client.update<
    NavigationEmbeddableCrudTypes['UpdateIn'],
    NavigationEmbeddableCrudTypes['UpdateOut']
  >({
    contentTypeId,
    id,
    data,
    options,
  });
  return res;
};

const deleteNavigationEmbeddable = async (id: string) => {
  await contentManagement.client.delete<
    NavigationEmbeddableCrudTypes['DeleteIn'],
    NavigationEmbeddableCrudTypes['DeleteOut']
  >({
    contentTypeId,
    id,
  });
};

const search = async (
  query: SearchQuery = {},
  options?: NavigationEmbeddableCrudTypes['SearchOptions']
) => {
  return contentManagement.client.search<
    NavigationEmbeddableCrudTypes['SearchIn'],
    NavigationEmbeddableCrudTypes['SearchOut']
  >({
    contentTypeId,
    query,
    options,
  });
};

export const navigationEmbeddableClient = {
  get,
  loadNavigationEmbeddableState,
  create,
  update,
  delete: deleteNavigationEmbeddable,
  search,
};
