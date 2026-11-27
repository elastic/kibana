/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import stripAnsi from 'strip-ansi';

// selects any code point not allowed by https://www.w3.org/TR/xml/#NT-Char. Keep it a single
// character class: a repeated alternation overflows the V8 stack on multi-MB inputs.
const invalidXmlCharsRE = /[^\x09\x0A\x0D\x20-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu;

export function escapeCdata(input: string) {
  return stripAnsi(input).replace(invalidXmlCharsRE, '');
}

type AttributeValue = string | number | boolean | null | undefined;

const escapeAttribute = (value: string) =>
  value
    .replace(invalidXmlCharsRE, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;')
    .replace(/\t/g, '&#x9;')
    .replace(/\n/g, '&#xA;')
    .replace(/\r/g, '&#xD;');

/**
 * Minimal XML element builder for the JUnit reporters. Attributes with `null` or `undefined`
 * values are skipped, text is written as CDATA, and output is a single line.
 */
export class XmlElement {
  private readonly attributes: string[] = [];
  private readonly children: Array<XmlElement | { cdata: string }> = [];

  constructor(
    private readonly name: string,
    attrs: Record<string, AttributeValue> = {}
  ) {
    this.att(attrs);
  }

  att(attrs: Record<string, AttributeValue>): this {
    for (const [key, value] of Object.entries(attrs)) {
      if (value === null || value === undefined) {
        continue;
      }
      this.attributes.push(` ${key}="${escapeAttribute(String(value))}"`);
    }
    return this;
  }

  ele(name: string, attrs?: Record<string, AttributeValue>): XmlElement {
    const child = new XmlElement(name, attrs);
    this.children.push(child);
    return child;
  }

  dat(text: string): this {
    this.children.push({ cdata: text.replace(/]]>/g, ']]]]><![CDATA[>') });
    return this;
  }

  toString(): string {
    const open = `<${this.name}${this.attributes.join('')}`;
    if (!this.children.length) {
      return `${open}/>`;
    }
    const inner = this.children
      .map((child) =>
        child instanceof XmlElement ? child.toString() : `<![CDATA[${child.cdata}]]>`
      )
      .join('');
    return `${open}>${inner}</${this.name}>`;
  }

  /** Serializes the document with an XML declaration */
  end(): string {
    return `<?xml version="1.0" encoding="utf-8"?>${this.toString()}`;
  }
}
