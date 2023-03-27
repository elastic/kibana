/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { JSDoc, JSDocTag, Node } from 'ts-morph';
import { TextWithLinks } from '../types';

/**
 * Extracts comments out of the node to use as the description.
 */
export function getCommentsFromNode(node: Node): TextWithLinks | undefined {
  let comments: TextWithLinks | undefined;
  const jsDocs = getJSDocs(node);
  if (jsDocs) {
    return getTextWithLinks(jsDocs.map((jsDoc) => jsDoc.getDescription()).join('\n'));
  } else {
    comments = getTextWithLinks(
      node
        .getLeadingCommentRanges()
        .map((c) => c.getText())
        .join('\n')
    );
  }

  return comments;
}

export function getJSDocs(node: Node): JSDoc[] | undefined {
  if (Node.isJSDocable(node)) {
    return node.getJsDocs();
  } else if (Node.isVariableDeclaration(node)) {
    const gparent = node.getParent()?.getParent();
    if (Node.isJSDocable(gparent)) {
      return gparent.getJsDocs();
    }
  }
}

export function getJSDocReturnTagComment(node: Node | JSDoc[]): TextWithLinks {
  const tags = getJSDocTags(node);
  const returnTag = tags.find((tag) => Node.isJSDocReturnTag(tag));
  if (returnTag) return getTextWithLinks(returnTag.getCommentText());
  return [];
}

export function getJSDocParamComment(node: Node | JSDoc[], name: string): TextWithLinks {
  const tags = getJSDocTags(node);
  const paramTag = tags.find((tag) => Node.isJSDocParameterTag(tag) && tag.getName() === name);
  if (paramTag) return getTextWithLinks(paramTag.getCommentText());
  return [];
}

export function getJSDocTags(node: Node | JSDoc[]): JSDocTag[] {
  const jsDocs = node instanceof Array ? node : getJSDocs(node);
  if (!jsDocs) return [];

  return jsDocs.reduce((tagsAcc, jsDoc) => {
    tagsAcc.push(...jsDoc.getTags());
    return tagsAcc;
  }, [] as JSDocTag[]);
}

/**
 * TODO. This feature is not implemented yet. It will be used to create links for comments
 * that use {@link AnotherAPIItemInThisPlugin}.
 *
 * @param text
 */
function getTextWithLinks(text?: string): TextWithLinks {
  if (text) return [text];
  else return [];
  // TODO:
  // Replace `@links` in comments with relative api links.
}
