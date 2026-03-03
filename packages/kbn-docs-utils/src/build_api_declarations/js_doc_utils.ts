/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JSDoc, JSDocTag } from 'ts-morph';
import { Node } from 'ts-morph';
import type { TextWithLinks } from '../types';

/**
 * Extracts comments from a node to use as the description.
 * Prefers JSDoc descriptions over leading comments.
 */
export const getCommentsFromNode = (node: Node): TextWithLinks | undefined => {
  const jsDocs = getJSDocs(node);
  if (jsDocs) {
    const description = jsDocs.map((jsDoc) => jsDoc.getDescription()).join('\n');
    return getTextWithLinks(description);
  }

  const leadingComments = node
    .getLeadingCommentRanges()
    .map((c) => c.getText())
    .join('\n');

  return getTextWithLinks(leadingComments);
};

/**
 * Extracts JSDoc comments from a node.
 * For variable declarations, checks the grandparent (VariableStatement) for JSDoc.
 */
export const getJSDocs = (node: Node): JSDoc[] | undefined => {
  if (Node.isJSDocable(node)) {
    return node.getJsDocs();
  }

  if (Node.isVariableDeclaration(node)) {
    const grandparent = node.getParent()?.getParent();

    if (Node.isJSDocable(grandparent)) {
      return grandparent.getJsDocs();
    }
  }

  return undefined;
};

/**
 * Extracts the @returns comment from a node or JSDoc array.
 */
export const getJSDocReturnTagComment = (node: Node | JSDoc[]): TextWithLinks => {
  const tags = getJSDocTags(node);
  const returnTag = tags.find((tag) => Node.isJSDocReturnTag(tag));
  return returnTag ? getTextWithLinks(returnTag.getCommentText()) : [];
};

/**
 * Normalizes a parameter name by removing braces and whitespace for matching.
 */
const normalizeParamName = (name: string): string => name.replace(/[{}\s]/g, '');

/**
 * Checks if a tag name matches any of the normalized parameter names.
 * Uses exact matching only to avoid cross-parameter leakage where a tag like
 * `@param options.foo` could incorrectly match a separate parameter named `foo`.
 */
const matchesParamName = (tagName: string, normalizedNames: string[]): boolean => {
  const normalizedTagName = normalizeParamName(tagName);
  return normalizedNames.includes(normalizedTagName);
};

/**
 * Parses raw JSDoc text to find @param entries that ts-morph might not normalize.
 * Returns the comment text if a matching parameter is found.
 */
const parseParamFromRawText = (text: string, normalizedNames: string[]): TextWithLinks | null => {
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.replace(/^\s*\*\s?/, '');
    if (!trimmed.includes('@param')) continue;

    const body = trimmed.trim().replace(/^@param\s+/, '');
    const parts = body.split(/\s+/);
    if (parts.length === 0) {
      continue;
    }

    // Skip type annotation if present (e.g., "{string} paramName")
    let nameIndex = 0;
    if (parts[0].startsWith('{')) {
      while (nameIndex < parts.length && !parts[nameIndex].endsWith('}')) {
        nameIndex += 1;
      }
      nameIndex += 1; // Move past the type token
    }

    const nameToken = parts[nameIndex];
    if (!nameToken) {
      continue;
    }

    const commentText = parts.slice(nameIndex + 1).join(' ');

    if (matchesParamName(nameToken, normalizedNames)) {
      return getTextWithLinks(commentText.trim());
    }
  }

  return null;
};

/**
 * Extracts JSDoc parameter comment for the given parameter name(s).
 * Supports both single names and dot-notation paths (e.g., "obj.prop").
 */
export const getJSDocParamComment = (
  node: Node | JSDoc[],
  name: string | string[]
): TextWithLinks => {
  const names = Array.isArray(name) ? name : [name];
  const normalizedNames = names.map(normalizeParamName);

  // First, try to find parameter tag using ts-morph's normalized tags
  const tags = getJSDocTags(node);
  const paramTag = tags.find((tag) => {
    if (!Node.isJSDocParameterTag(tag)) {
      return false;
    }

    return matchesParamName(tag.getName(), normalizedNames);
  });

  if (paramTag) {
    return getTextWithLinks(paramTag.getCommentText());
  }

  // Fallback: parse raw JSDoc text for @param entries that ts-morph might not normalize
  const jsDocs = node instanceof Array ? node : getJSDocs(node);
  if (jsDocs) {
    for (const jsDoc of jsDocs) {
      const parsed = parseParamFromRawText(jsDoc.getText(), normalizedNames);
      if (parsed) {
        return parsed;
      }
    }
  }

  // Final fallback: scan leading comments for @param tags
  if (!(node instanceof Array)) {
    const leadingCommentRanges = node.getLeadingCommentRanges();
    if (leadingCommentRanges.length > 0) {
      const leadingText = leadingCommentRanges.map((c) => c.getText()).join('\n');
      const parsed = parseParamFromRawText(leadingText, normalizedNames);
      if (parsed) {
        return parsed;
      }
    }
  }

  return [];
};

/**
 * Extracts all JSDoc tags from a node or JSDoc array.
 */
export const getJSDocTags = (node: Node | JSDoc[]): JSDocTag[] => {
  const jsDocs = node instanceof Array ? node : getJSDocs(node);
  if (!jsDocs) {
    return [];
  }

  return jsDocs.flatMap((jsDoc) => jsDoc.getTags());
};

/**
 * Converts text to TextWithLinks format.
 * TODO: This feature is not fully implemented yet. It will be used to create links for comments
 * that use {@link AnotherAPIItemInThisPlugin}.
 */
const getTextWithLinks = (text?: string): TextWithLinks => {
  return text ? [text] : [];
  // TODO: Replace `@links` in comments with relative api links.
};
