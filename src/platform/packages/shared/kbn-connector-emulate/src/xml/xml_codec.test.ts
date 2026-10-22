/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fromXml, isXmlMediaType, toXml } from './xml_codec';

const document = {
  openapi: '3.0.3',
  components: {
    schemas: {
      Owner: {
        type: 'object',
        xml: { name: 'Owner' },
        properties: { id: { type: 'string', xml: { name: 'ID' } } },
      },
      Listing: {
        type: 'object',
        xml: { name: 'ListBucketResult', namespace: 'http://s3.amazonaws.com/doc/2006-03-01/' },
        properties: {
          version: { type: 'string', xml: { attribute: true } },
          name: { type: 'string', xml: { name: 'Name' } },
          truncated: { type: 'boolean', xml: { name: 'IsTruncated' } },
          count: { type: 'integer' },
          ratio: { anyOf: [{ type: 'number' }, { type: 'string', enum: ['NaN'] }] },
          // A wrapped list of `member` elements, a flattened one, and a list of lists.
          tags: {
            type: 'array',
            xml: { wrapped: true },
            items: { type: 'string', xml: { name: 'member' } },
          },
          contents: {
            type: 'array',
            xml: { name: 'Contents', wrapped: false },
            items: { allOf: [{ $ref: '#/components/schemas/Owner' }], xml: { name: 'Contents' } },
          },
          grid: {
            type: 'array',
            xml: { wrapped: true },
            items: {
              type: 'array',
              xml: { name: 'row' },
              items: { type: 'integer', xml: { name: 'cell' } },
            },
          },
          labels: {
            type: 'object',
            additionalProperties: { type: 'string' },
            'x-smithy-xml-map': { key: 'Key', value: 'Value' },
          },
          owner: { $ref: '#/components/schemas/Owner' },
        },
      },
    },
  },
};
const schema = { $ref: '#/components/schemas/Listing' };

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/" version="2">',
  '  <!-- a comment -->',
  '  <Name>logs</Name>',
  '  <IsTruncated>false</IsTruncated>',
  '  <count>2</count>',
  '  <ratio>NaN</ratio>',
  '  <tags><member>a</member><member>b</member></tags>',
  '  <Contents><ID>1</ID></Contents>',
  '  <Contents><ID>2</ID></Contents>',
  '  <grid><row><cell>1</cell><cell>2</cell></row><row><cell>3</cell></row></grid>',
  '  <labels><entry><Key>env</Key><Value>prod</Value></entry></labels>',
  '  <owner><ID>me</ID></owner>',
  '  <unmodeled>ignored</unmodeled>',
  '</ListBucketResult>',
].join('\n');

const value = {
  version: '2',
  name: 'logs',
  truncated: false,
  count: 2,
  ratio: 'NaN',
  tags: ['a', 'b'],
  contents: [{ id: '1' }, { id: '2' }],
  grid: [[1, 2], [3]],
  labels: { env: 'prod' },
  owner: { id: 'me' },
};

describe('xml codec', () => {
  it('reads elements, attributes, lists, maps and scalars as the schema describes them', () => {
    expect(fromXml(xml, schema, document)).toEqual({ value });
  });

  it('writes the value back as the same document', () => {
    const written = toXml(value, schema, document);

    expect(written).toBe(
      '<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/" version="2">' +
        '<Name>logs</Name><IsTruncated>false</IsTruncated><count>2</count><ratio>NaN</ratio>' +
        '<tags><member>a</member><member>b</member></tags>' +
        '<Contents><ID>1</ID></Contents><Contents><ID>2</ID></Contents>' +
        '<grid><row><cell>1</cell><cell>2</cell></row><row><cell>3</cell></row></grid>' +
        '<labels><entry><Key>env</Key><Value>prod</Value></entry></labels>' +
        '<owner><ID>me</ID></owner></ListBucketResult>'
    );
    expect(fromXml(written, schema, document)).toEqual({ value });
  });

  it('escapes text and attributes, and leaves values that fit no type as text', () => {
    const written = toXml({ name: 'a<b & "c"', version: '"1"', count: 1 }, schema, document);

    expect(written).toContain('version="&quot;1&quot;"');
    expect(written).toContain('<Name>a&lt;b &amp; "c"</Name>');
    expect(
      fromXml('<ListBucketResult><count>two</count></ListBucketResult>', schema, document)
    ).toEqual({
      value: { count: 'two' },
    });
  });

  it('reports documents that are not XML', () => {
    expect(fromXml('<ListBucketResult>', schema, document)).toEqual({
      error: expect.stringContaining('Unclosed root tag'),
    });
  });

  it.each([
    ['application/xml', true],
    ['text/xml', true],
    ['application/atom+xml', true],
    ['application/json', false],
    ['application/xml-dtd', false],
  ])('recognizes %s as XML: %s', (mediaType, expected) => {
    expect(isXmlMediaType(mediaType)).toBe(expected);
  });
});
