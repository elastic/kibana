/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RequestHandlerContext, SavedObject, SavedObjectsFindResponse } from '@kbn/core/server';
import Boom from '@hapi/boom';
import { CONSOLE_SNIPPET_SAVED_OBJECT_TYPE } from '../../../../../common/constants';

export interface ConsoleSnippetAttributes {
  title: string;
  description?: string;
  query: string;
  endpoint?: string;
  method?: string;
  tags?: string[];
  createdBy?: string;
  updatedBy?: string;
}

export interface SavedSnippet {
  id: string;
  type: string;
  attributes: ConsoleSnippetAttributes;
  updated_at?: string;
  created_at?: string;
}

function transformToSavedSnippet(savedObject: SavedObject<ConsoleSnippetAttributes>): SavedSnippet {
  return {
    id: savedObject.id,
    type: savedObject.type,
    attributes: savedObject.attributes,
    updated_at: savedObject.updated_at,
    created_at: savedObject.created_at,
  };
}

export async function createSavedSnippet(
  context: RequestHandlerContext,
  attributes: ConsoleSnippetAttributes
): Promise<SavedSnippet> {
  const { savedObjects } = await context.core;
  const soClient = savedObjects.client;

  // Check for duplicate titles
  const duplicates = await soClient.find<ConsoleSnippetAttributes>({
    type: CONSOLE_SNIPPET_SAVED_OBJECT_TYPE,
    searchFields: ['titleKeyword'],
    search: `"${attributes.title.trim()}"`,
  });

  if (duplicates.total > 0) {
    throw Boom.conflict('A snippet with this title already exists');
  }

  // Add titleKeyword for exact matching
  const internalAttributes = {
    ...attributes,
    titleKeyword: attributes.title.trim(),
  };

  const savedObject = await soClient.create<ConsoleSnippetAttributes>(
    CONSOLE_SNIPPET_SAVED_OBJECT_TYPE,
    internalAttributes
  );

  return transformToSavedSnippet(savedObject);
}

export async function updateSavedSnippet(
  context: RequestHandlerContext,
  id: string,
  attributes: ConsoleSnippetAttributes
): Promise<SavedSnippet> {
  const { savedObjects } = await context.core;
  const soClient = savedObjects.client;

  // Check for duplicate titles (excluding current snippet)
  const duplicates = await soClient.find<ConsoleSnippetAttributes>({
    type: CONSOLE_SNIPPET_SAVED_OBJECT_TYPE,
    searchFields: ['titleKeyword'],
    search: `"${attributes.title.trim()}"`,
  });

  if (duplicates.total > 0 && duplicates.saved_objects.some((obj) => obj.id !== id)) {
    throw Boom.conflict('A snippet with this title already exists');
  }

  // Add titleKeyword for exact matching
  const internalAttributes = {
    ...attributes,
    titleKeyword: attributes.title.trim(),
  };

  const savedObject = await soClient.update<ConsoleSnippetAttributes>(
    CONSOLE_SNIPPET_SAVED_OBJECT_TYPE,
    id,
    internalAttributes
  );

  return {
    id: savedObject.id,
    type: CONSOLE_SNIPPET_SAVED_OBJECT_TYPE,
    attributes,
    updated_at: savedObject.updated_at,
  };
}

export async function deleteSavedSnippet(
  context: RequestHandlerContext,
  id: string
): Promise<void> {
  const { savedObjects } = await context.core;
  const soClient = savedObjects.client;

  await soClient.delete(CONSOLE_SNIPPET_SAVED_OBJECT_TYPE, id);
}

export async function getSavedSnippet(
  context: RequestHandlerContext,
  id: string
): Promise<SavedSnippet> {
  const { savedObjects } = await context.core;
  const soClient = savedObjects.client;

  const savedObject = await soClient.get<ConsoleSnippetAttributes>(
    CONSOLE_SNIPPET_SAVED_OBJECT_TYPE,
    id
  );

  return transformToSavedSnippet(savedObject);
}

export async function findSavedSnippets(
  context: RequestHandlerContext,
  search?: string,
  perPage: number = 20,
  page: number = 1
): Promise<{ total: number; snippets: SavedSnippet[] }> {
  const { savedObjects } = await context.core;
  const soClient = savedObjects.client;

  const result: SavedObjectsFindResponse<ConsoleSnippetAttributes> = await soClient.find({
    type: CONSOLE_SNIPPET_SAVED_OBJECT_TYPE,
    search,
    searchFields: ['title', 'description', 'tags'],
    perPage,
    page,
    sortField: 'updated_at',
    sortOrder: 'desc',
  });

  return {
    total: result.total,
    snippets: result.saved_objects.map(transformToSavedSnippet),
  };
}
