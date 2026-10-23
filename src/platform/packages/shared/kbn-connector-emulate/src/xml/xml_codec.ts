/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from 'xml2js';
import { getAtPointer, refToPointer } from '../openapi/json_pointer';
import { isRecord } from '../openapi/schema_walk';
import type { JsonSchema, OpenApiDocument } from '../openapi/types';

/** OpenAPI's `xml` object, plus `x-smithy-xml-map` for maps, which OpenAPI can't describe. */
interface XmlObject {
  readonly name?: string;
  readonly namespace?: string;
  readonly prefix?: string;
  readonly attribute?: boolean;
  readonly wrapped?: boolean;
}

interface XmlMap {
  readonly key: string;
  readonly value: string;
  readonly keyNamespace?: string;
  readonly valueNamespace?: string;
  readonly flattened?: boolean;
}

const XML_MAP = 'x-smithy-xml-map';

interface XmlElement {
  readonly name: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly children: readonly XmlElement[];
  readonly text: string;
}

/** Whether a media type is XML, such as `application/xml` or `application/atom+xml`. */
export const isXmlMediaType = (mediaType: string): boolean =>
  /^(application|text)\/([\w.-]+\+)?xml$/.test(mediaType);

const localName = (name: string): string => name.slice(name.indexOf(':') + 1);

const toElement = (node: Record<string, unknown>): XmlElement => ({
  name: String(node['#name'] ?? ''),
  attributes: isRecord(node.$)
    ? Object.fromEntries(Object.entries(node.$).map(([key, value]) => [key, String(value)]))
    : {},
  children: (Array.isArray(node.$$) ? node.$$ : []).filter(isRecord).map(toElement),
  text: typeof node._ === 'string' ? node._ : '',
});

/** Parses an XML document into its root element, or returns the parser's error. */
const parseXml = (text: string): XmlElement | Error => {
  let result: XmlElement | Error = new Error('The XML parser did not finish');
  // With `async: false`, xml2js calls back before `parseString` returns.
  new Parser({
    explicitRoot: true,
    explicitArray: true,
    explicitChildren: true,
    preserveChildrenOrder: true,
    charsAsChildren: false,
    trim: false,
    normalize: false,
    async: false,
  }).parseString(text, (error: Error | null, parsed: unknown) => {
    const [root] = isRecord(parsed) ? Object.values(parsed) : [];
    result =
      error ?? (isRecord(root) ? toElement(root) : new Error('The document has no root element'));
  });
  return result;
};

/** A codec for the XML documents an OpenAPI document's schemas describe. */
const createCodec = (document: OpenApiDocument) => {
  // Follows `$ref`s, and `allOf` wrappers that only add `xml` to a `$ref`.
  const resolve = (schema: unknown, depth = 0): JsonSchema => {
    if (!isRecord(schema) || depth > 32) {
      return {};
    }
    if (typeof schema.$ref === 'string') {
      return resolve(getAtPointer(document, refToPointer(schema.$ref)), depth + 1);
    }
    if (Array.isArray(schema.allOf) && schema.allOf.length === 1) {
      return resolve(schema.allOf[0], depth + 1);
    }
    return schema;
  };
  // The `xml` written on the schema itself, which names the element where it's used.
  const ownXml = (schema: unknown): XmlObject =>
    isRecord(schema) && isRecord(schema.xml) ? (schema.xml as XmlObject) : {};
  const xmlMap = (schema: JsonSchema): XmlMap | undefined =>
    isRecord(schema[XML_MAP]) ? (schema[XML_MAP] as unknown as XmlMap) : undefined;
  const isArray = (schema: JsonSchema) => schema.type === 'array';
  const isObject = (schema: JsonSchema) =>
    schema.type === 'object' || isRecord(schema.properties) || Array.isArray(schema.oneOf);

  const childrenNamed = (element: XmlElement, name: string) =>
    element.children.filter((child) => localName(child.name) === localName(name));

  const decodeScalar = (text: string, schema: JsonSchema): unknown => {
    const variants = Array.isArray(schema.anyOf)
      ? schema.anyOf.map((variant) => resolve(variant))
      : [schema];
    for (const variant of variants) {
      if (variant.type === 'integer' && /^-?\d+$/.test(text.trim())) {
        return Number(text);
      }
      if (variant.type === 'number' && text.trim() !== '' && Number.isFinite(Number(text))) {
        return Number(text);
      }
      if (variant.type === 'boolean' && (text === 'true' || text === 'false')) {
        return text === 'true';
      }
    }
    // Left as text, so validation reports values that don't fit, and keeps `NaN` for doubles.
    return text;
  };

  const decodeMap = (entries: readonly XmlElement[], schema: JsonSchema, map: XmlMap) =>
    Object.fromEntries(
      entries.flatMap((entry) => {
        const [key] = childrenNamed(entry, map.key);
        const [value] = childrenNamed(entry, map.value);
        return key ? [[key.text, value ? decode(value, schema.additionalProperties) : null]] : [];
      })
    );

  function decode(element: XmlElement, schema: unknown): unknown {
    const target = resolve(schema);
    const map = xmlMap(target);
    if (map) {
      return decodeMap(childrenNamed(element, 'entry'), target, map);
    }
    // A list in a list: the element wraps its items.
    if (isArray(target)) {
      const itemName = ownXml(target.items).name ?? 'member';
      return childrenNamed(element, itemName).map((item) => decode(item, target.items));
    }
    if (Array.isArray(target.oneOf)) {
      // A union: the variant whose member the element has.
      for (const variant of target.oneOf.map((option) => resolve(option))) {
        const decoded = decodeStructure(element, variant);
        if (Object.keys(decoded).length > 0) {
          return decoded;
        }
      }
      return {};
    }
    return isObject(target) ? decodeStructure(element, target) : decodeScalar(element.text, target);
  }

  function decodeStructure(element: XmlElement, schema: JsonSchema): Record<string, unknown> {
    const decoded: Record<string, unknown> = {};
    for (const [property, propertySchema] of Object.entries(
      isRecord(schema.properties) ? schema.properties : {}
    )) {
      const xml = ownXml(propertySchema);
      const name = xml.name ?? property;
      const target = resolve(propertySchema);
      if (xml.attribute) {
        const value =
          element.attributes[name] ??
          Object.entries(element.attributes).find(
            ([key]) => localName(key) === localName(name)
          )?.[1];
        if (value !== undefined) {
          decoded[property] = decodeScalar(value, target);
        }
        continue;
      }
      const map = xmlMap(target);
      if (isArray(target)) {
        const itemName = ownXml(target.items).name ?? name;
        const [wrapper] = xml.wrapped ? childrenNamed(element, name) : [element];
        const items = wrapper ? childrenNamed(wrapper, itemName) : [];
        // An empty wrapper is an empty list; a flattened list without items is absent.
        if (wrapper && (xml.wrapped || items.length > 0)) {
          decoded[property] = items.map((item) => decode(item, target.items));
        }
      } else if (map?.flattened) {
        const entries = childrenNamed(element, name);
        if (entries.length > 0) {
          decoded[property] = decodeMap(entries, target, map);
        }
      } else {
        const [child] = childrenNamed(element, name);
        if (child) {
          decoded[property] = decode(child, propertySchema);
        }
      }
    }
    return decoded;
  }

  const escape = (text: string, attribute = false) =>
    text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, attribute ? '&quot;' : '"');

  const namespaceAttribute = ({ namespace, prefix }: XmlObject) =>
    namespace ? ` xmlns${prefix ? `:${prefix}` : ''}="${escape(namespace, true)}"` : '';

  const scalarText = (value: unknown): string =>
    typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value);

  const encodeMapEntries = (
    value: unknown,
    schema: JsonSchema,
    map: XmlMap,
    entryName: string,
    entryXml: XmlObject = {}
  ) =>
    Object.entries(isRecord(value) ? value : {})
      .map(
        ([key, entry]) =>
          `<${entryName}${namespaceAttribute(entryXml)}><${map.key}${namespaceAttribute({
            namespace: map.keyNamespace,
          })}>${escape(key)}</${map.key}>${encode(map.value, entry, schema.additionalProperties, {
            ...ownXml(schema.additionalProperties),
            ...(map.valueNamespace ? { namespace: map.valueNamespace } : {}),
          })}</${entryName}>`
      )
      .join('');

  function encode(
    name: string,
    value: unknown,
    schema: unknown,
    xml: XmlObject = ownXml(schema)
  ): string {
    const target = resolve(schema);
    const map = xmlMap(target);
    const open = `${name}${namespaceAttribute(xml)}`;
    if (map) {
      return `<${open}>${encodeMapEntries(value, target, map, 'entry')}</${name}>`;
    }
    if (isArray(target) && Array.isArray(value)) {
      const itemName = ownXml(target.items).name ?? 'member';
      return `<${open}>${value
        .map((item) => encode(itemName, item, target.items))
        .join('')}</${name}>`;
    }
    if (!isObject(target)) {
      return `<${open}>${escape(scalarText(value))}</${name}>`;
    }
    const properties = Array.isArray(target.oneOf)
      ? Object.assign({}, ...target.oneOf.map((variant) => resolve(variant).properties ?? {}))
      : isRecord(target.properties)
      ? target.properties
      : {};
    const values = isRecord(value) ? value : {};
    let attributes = '';
    let children = '';
    for (const [property, propertySchema] of Object.entries(properties)) {
      const member = values[property];
      if (member === undefined || member === null) {
        continue;
      }
      const memberXml = ownXml(propertySchema);
      const memberName = memberXml.name ?? property;
      const memberTarget = resolve(propertySchema);
      const memberMap = xmlMap(memberTarget);
      if (memberXml.attribute) {
        attributes += ` ${memberName}="${escape(scalarText(member), true)}"`;
      } else if (isArray(memberTarget) && Array.isArray(member)) {
        const itemName = ownXml(memberTarget.items).name ?? memberName;
        const items = member.map((item) => encode(itemName, item, memberTarget.items)).join('');
        children += memberXml.wrapped
          ? `<${memberName}${namespaceAttribute(memberXml)}>${items}</${memberName}>`
          : items;
      } else if (memberMap?.flattened) {
        children += encodeMapEntries(member, memberTarget, memberMap, memberName, memberXml);
      } else {
        children += encode(memberName, member, propertySchema, memberXml);
      }
    }
    return `<${open}${attributes}>${children}</${name}>`;
  }

  return {
    decode: (text: string, schema: unknown): { value: unknown } | { error: string } => {
      const root = parseXml(text);
      return root instanceof Error ? { error: root.message } : { value: decode(root, schema) };
    },
    encode: (value: unknown, schema: unknown): string => {
      const xml = { ...(resolve(schema).xml as XmlObject), ...ownXml(schema) };
      return encode(xml.name ?? 'Document', value, schema, xml);
    },
  };
};

const codecs = new WeakMap<OpenApiDocument, ReturnType<typeof createCodec>>();

const codecFor = (document: OpenApiDocument) => {
  const codec = codecs.get(document) ?? createCodec(document);
  codecs.set(document, codec);
  return codec;
};

/**
 * Reads an XML document as the value its schema describes: element names, attributes,
 * namespaces and list wrapping from OpenAPI's `xml` objects, maps from `x-smithy-xml-map`, and
 * scalars converted to the schema's type. Elements are matched by local name.
 */
export const fromXml = (
  text: string,
  schema: unknown,
  document: OpenApiDocument
): { value: unknown } | { error: string } => codecFor(document).decode(text, schema);

/** Writes a value as the XML document its schema describes; the inverse of `fromXml`. */
export const toXml = (value: unknown, schema: unknown, document: OpenApiDocument): string =>
  codecFor(document).encode(value, schema);
