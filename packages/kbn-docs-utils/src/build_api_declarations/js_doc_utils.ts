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
import type { ApiScope } from '../types';
import type { BuildApiDecOpts } from './types';
import { getApiSectionId, getPluginApiDocId } from '../utils';

/**
 * Plugin context needed to resolve {@link} tags into cross-reference links.
 */
export interface PluginContext {
  pluginId: string;
  scope: ApiScope;
  docId: string;
}

export const getPluginContextForNode = (node: Node, opts: BuildApiDecOpts): PluginContext => {
  const currentPlugin = opts.plugins.find((plugin) => plugin.id === opts.currentPluginId);
  const apiPath = node.getSourceFile().getFilePath();

  return {
    pluginId: opts.currentPluginId,
    scope: opts.scope,
    docId: currentPlugin
      ? getPluginApiDocId(currentPlugin.id, {
          serviceFolders: currentPlugin.manifest.serviceFolders,
          apiPath,
          directory: currentPlugin.directory,
        })
      : getPluginApiDocId(opts.currentPluginId),
  };
};

/**
 * Extracts comments from a node to use as the description.
 * Prefers JSDoc descriptions over leading comments.
 */
export const getCommentsFromNode = (
  node: Node,
  pluginContext?: PluginContext
): TextWithLinks | undefined => {
  const jsDocs = getJSDocs(node);
  if (jsDocs) {
    const description = jsDocs.map((jsDoc) => jsDoc.getDescription()).join('\n');
    return getTextWithLinks(description, pluginContext);
  }

  const leadingComments = node
    .getLeadingCommentRanges()
    .map((c) => c.getText())
    .join('\n');

  return getTextWithLinks(leadingComments, pluginContext);
};

/**
 * Extracts JSDoc comments from a node.
 * For variable declarations, checks the grandparent (VariableStatement) for JSDoc.
 */
export const getJSDocs = (node: Node): JSDoc[] | undefined => {
  if (Node.isJSDocable(node)) {
    return node.getJsDocs();
  }

  // PropertyAssignment nodes inside object literals are JSDocable but virtually
  // never carry their own JSDoc — the real block lives on the enclosing
  // VariableStatement. The 4-parent chain (PropertyAssignment → ObjectLiteral →
  // VariableDeclaration → VariableDeclarationList → VariableStatement) is exact
  // for the `export const x = { prop: ... }` shape. A general ancestor-walk loop
  // would risk matching an unrelated VariableStatement higher up; the fixed chain
  // is rigid but precise, and the AST shape here is structural to TypeScript.
  if (Node.isPropertyAssignment(node)) {
    if (node.getLeadingCommentRanges().length > 0) {
      return undefined;
    }

    const variableStatement = node.getParent()?.getParent()?.getParent()?.getParent();
    if (Node.isJSDocable(variableStatement)) {
      return variableStatement.getJsDocs();
    }
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
export const getJSDocReturnTagComment = (
  node: Node | JSDoc[],
  pluginContext?: PluginContext
): TextWithLinks => {
  const tags = getJSDocTags(node);
  const returnTag = tags.find((tag) => Node.isJSDocReturnTag(tag));
  return returnTag ? getTextWithLinks(returnTag.getCommentText(), pluginContext) : [];
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
const parseParamFromRawText = (
  text: string,
  normalizedNames: string[],
  pluginContext?: PluginContext
): TextWithLinks | null => {
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
      return getTextWithLinks(commentText.trim(), pluginContext);
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
  name: string | string[],
  pluginContext?: PluginContext
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
    return getTextWithLinks(paramTag.getCommentText(), pluginContext);
  }

  // Fallback: parse raw JSDoc text for @param entries that ts-morph might not normalize
  const jsDocs = node instanceof Array ? node : getJSDocs(node);
  if (jsDocs) {
    for (const jsDoc of jsDocs) {
      const parsed = parseParamFromRawText(jsDoc.getText(), normalizedNames, pluginContext);
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
      const parsed = parseParamFromRawText(leadingText, normalizedNames, pluginContext);
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
 * Converts text to TextWithLinks format, resolving `{@link Identifier}` tags into
 * cross-reference links when plugin context is available.
 *
 * Supports two syntaxes:
 * - `{@link Identifier}` — links to the identifier and displays its name.
 * - `{@link Identifier | display text}` — links to the identifier with custom display text.
 */
const parseLinkBody = (body: string): { target: string; displayText?: string } => {
  const pipeIndex = body.indexOf('|');
  if (pipeIndex >= 0) {
    return {
      target: body.slice(0, pipeIndex).trim(),
      displayText: body.slice(pipeIndex + 1).trim(),
    };
  }

  const spaceMatch = body.match(/^(\S+)\s+(.+)$/);
  if (spaceMatch) {
    return {
      target: spaceMatch[1].trim(),
      displayText: spaceMatch[2].trim(),
    };
  }

  return { target: body.trim() };
};

const localIdentifierPattern = /^[A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*$/;

const toLocalReference = (target: string, displayText: string, pluginContext?: PluginContext) => {
  if (!pluginContext || !localIdentifierPattern.test(target)) {
    return undefined;
  }

  return {
    pluginId: pluginContext.pluginId,
    scope: pluginContext.scope,
    docId: pluginContext.docId,
    section: getApiSectionId({
      id: target,
      scope: pluginContext.scope,
    }),
    text: displayText,
  };
};

const getTextWithLinks = (text?: string, pluginContext?: PluginContext): TextWithLinks => {
  if (!text) {
    return [];
  }

  const linkPattern = /\{@link\s+([^}]+?)\}/g;
  let match = linkPattern.exec(text);

  // Fast path: no {@link} tags found, return as-is.
  if (!match) {
    return [text];
  }

  const parts: TextWithLinks = [];
  let lastIndex = 0;

  do {
    // Add text before the link.
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const { target, displayText } = parseLinkBody(match[1].trim());
    const fallbackText = displayText || target;

    parts.push(toLocalReference(target, fallbackText, pluginContext) ?? fallbackText);

    lastIndex = match.index + match[0].length;
    match = linkPattern.exec(text);
  } while (match);

  // Add remaining text after the last link.
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
};
