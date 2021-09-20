/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { JSDocTag, Node } from 'ts-morph';
import { ApiDeclaration } from '../types';
import { maybeCollectReferences } from './get_references';
import { getSignature } from './get_signature';
import { getTypeKind } from './get_type_kind';
import { getCommentsFromNode, getJSDocTags } from './js_doc_utils';
import { BuildApiDecOpts } from './types';
import { getSourceForNode } from './utils';

/**
 * @returns an ApiDeclaration with common functionality that every node shares. Type specific attributes, like
 * children or references, still need to be added in.
 */
export function buildBasicApiDeclaration(node: Node, opts: BuildApiDecOpts): ApiDeclaration {
  const tags = getJSDocTags(node);
  const deprecated = tags.find((t) => t.getTagName() === 'deprecated') !== undefined;
  const removeByTag = tags.find((t) => t.getTagName() === 'removeBy');

  const apiDec = {
    parentPluginId: opts.currentPluginId,
    id: opts.id,
    type: getTypeKind(node),
    tags: getTagNames(tags),
    label: opts.name,
    description: getCommentsFromNode(node),
    signature: getSignature(node, opts.plugins, opts.log),
    path: getSourceForNode(node),
    deprecated,
    removeBy: removeByTag ? removeByTag.getComment() : undefined,
  };
  return {
    ...apiDec,
    references: maybeCollectReferences({
      ...opts,
      apiDec,
      node,
    }),
  };
}

function getTagNames(tags: JSDocTag[]) {
  const tagsToIgnore = [
    'param',
    'returns',
    'link',
    'remark',
    'internalRemarks',
    'typeParam',
    'remarks',
    'example',
    'kbn',
    'public',
    'removeBy',
  ];
  return tags.reduce((tagNames, tag) => {
    if (tagsToIgnore.indexOf(tag.getTagName()) < 0) {
      tagNames.push(tag.getTagName());
    }
    return tagNames;
  }, [] as string[]);
}
