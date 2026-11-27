/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

/**
 * No-op i18n implementation for the standalone package.
 *
 * Source components call `i18n.translate()` and render `<FormattedMessage>` for
 * internal labels. Without the Kibana i18n runtime, these stubs render the
 * `defaultMessage` (with `{placeholder}` interpolation, React element values
 * rendered in place, and `<tag>…</tag>` rendering by calling the matching
 * function) so the component works out of the box for non-Kibana consumers.
 */

type TagRenderer = (chunks: React.ReactNode[]) => React.ReactNode;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isTagRenderer = (value: unknown): value is TagRenderer => typeof value === 'function';

const isElementValue = (value: unknown): value is React.ReactElement => React.isValidElement(value);

/**
 * Replaces `{placeholder}` values. Function values are rich-text tags and React element
 * values are rendered by {@link renderElementPlaceholders}, so both are left in place.
 */
const interpolate = (template: string, values?: Record<string, unknown>): string => {
  if (!values) {
    return template;
  }

  return Object.entries(values).reduce((result, [key, val]) => {
    if (isTagRenderer(val) || isElementValue(val)) {
      return result;
    }
    return result.replace(new RegExp(`\\{${escapeRegExp(key)}\\}`, 'g'), String(val));
  }, template);
};

/** Splits text on `{placeholder}`s whose value is a React element, rendering the element in place. */
const renderElementPlaceholders = (
  text: string,
  values: Record<string, unknown>
): React.ReactNode[] => {
  const elements = new Map(
    Object.entries(values).filter((entry): entry is [string, React.ReactElement] =>
      isElementValue(entry[1])
    )
  );
  if (elements.size === 0) {
    return [text];
  }

  const keys = [...elements.keys()].map(escapeRegExp).join('|');
  const placeholder = new RegExp(`\\{(${keys})\\}`, 'g');
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(placeholder)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      nodes.push(text.slice(lastIndex, index));
    }
    nodes.push(elements.get(match[1]));
    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
};

interface TagMatch {
  key: string;
  renderTag: TagRenderer;
  start: number;
  end: number;
}

/** Finds the first `<tag>…</tag>` in the template whose name is a function in `values`. */
const findLeftmostTag = (
  template: string,
  values: Record<string, unknown>
): TagMatch | undefined => {
  const openingTag = /<([A-Za-z0-9_]+)>/g;
  let found: RegExpExecArray | null;

  while ((found = openingTag.exec(template)) !== null) {
    const key = found[1];
    const renderTag = values[key];
    if (!isTagRenderer(renderTag)) {
      continue;
    }

    const end = template.indexOf(`</${key}>`, found.index + found[0].length);
    if (end === -1) {
      continue;
    }

    return { key, renderTag, start: found.index, end };
  }

  return undefined;
};

/** Applies `{placeholder}`, React element and `<tag>…</tag>` values to a default message. */
export const renderDefaultMessage = (
  template: string,
  values?: Record<string, unknown>
): React.ReactNode => {
  if (!values) {
    return template;
  }

  const parts: React.ReactNode[] = [];
  let remaining = interpolate(template, values);
  let tag = findLeftmostTag(remaining, values);

  while (tag) {
    const openLength = `<${tag.key}>`.length;
    const closeLength = `</${tag.key}>`.length;
    const before = remaining.slice(0, tag.start);
    const inner = remaining.slice(tag.start + openLength, tag.end);

    if (before) {
      parts.push(...renderElementPlaceholders(before, values));
    }
    parts.push(tag.renderTag(React.Children.toArray(renderElementPlaceholders(inner, values))));

    remaining = remaining.slice(tag.end + closeLength);
    tag = findLeftmostTag(remaining, values);
  }

  if (remaining) {
    parts.push(...renderElementPlaceholders(remaining, values));
  }

  if (parts.length === 1) {
    return parts[0];
  }

  return (
    <>
      {parts.map((part, index) => (
        <React.Fragment key={index}>{part}</React.Fragment>
      ))}
    </>
  );
};

/** No-op `i18n.translate` that returns `defaultMessage` with interpolated values. */
export const translate = (
  _id: string,
  options?: { defaultMessage?: string; values?: Record<string, unknown> }
): string => interpolate(options?.defaultMessage ?? _id, options?.values);

/** No-op `FormattedMessage` component that renders `defaultMessage`. */
export const FormattedMessage: React.FC<{
  id: string;
  defaultMessage?: string;
  values?: Record<string, unknown>;
}> = ({ id, defaultMessage, values }) => {
  if (values && defaultMessage) {
    return <>{renderDefaultMessage(defaultMessage, values)}</>;
  }
  return <>{defaultMessage ?? id}</>;
};

/** No-op `I18nProvider` that renders children unchanged. */
export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export const i18n = { translate };
