/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { fileResponseFactory } from './response';

describe('fileResponseFactory', () => {
  describe('res.file', () => {
    it('returns a kibana response with attachment', () => {
      const body = Buffer.from('Attachment content');
      const result = fileResponseFactory.file({
        body,
        filename: 'myfile.test',
        fileContentSize: 30,
      });
      expect(result.payload).toBe(body);
      expect(result.status).toBe(200);
      expect(result.options.headers).toMatchInlineSnapshot(`
        Object {
          "content-disposition": "attachment; filename=myfile.test",
          "content-length": "30",
          "content-type": "application/octet-stream",
          "x-content-type-options": "nosniff",
        }
      `);
    });

    it('converts string body content to buffer in response', () => {
      const body = 'I am a string';
      const result = fileResponseFactory.file({ body, filename: 'myfile.test' });
      expect(result.payload?.toString()).toBe(body);
    });

    it('doesnt pass utf-16 characters in filename into the content-disposition header', () => {
      const isMultiByte = (str: string) => [...str].some((c) => (c.codePointAt(0) || 0) > 255);
      const multuByteCharacters = '日本語ダッシュボード.pdf';

      const result = fileResponseFactory.file({
        body: 'content',
        filename: multuByteCharacters,
      });
      const { headers } = result.options;
      if (!headers) {
        throw new Error('Missing headers');
      }

      const contentDispositionHeader = headers['content-disposition'];
      if (typeof contentDispositionHeader !== 'string') {
        throw new Error(`Expecting a string content-disposition header`);
      }

      expect(typeof contentDispositionHeader).toBe('string');
      expect(isMultiByte(multuByteCharacters)).toBe(true);
      expect(contentDispositionHeader).toMatchInlineSnapshot(
        `"attachment; filename=%E6%97%A5%E6%9C%AC%E8%AA%9E%E3%83%80%E3%83%83%E3%82%B7%E3%83%A5%E3%83%9C%E3%83%BC%E3%83%89.pdf"`
      );
      expect(isMultiByte(contentDispositionHeader)).toBe(false);
      expect(decodeURIComponent(contentDispositionHeader)).toBe(
        `attachment; filename=${multuByteCharacters}`
      );
    });

    it('accepts additional headers but doesnt override file headers', () => {
      const extraHeaders = { 'content-language': 'en', 'x-test-header': 'ok' };
      const overrideHeaders = {
        'content-disposition': 'i will not be in the response',
        'content-length': 'i will not be in the response',
      };
      const filename = 'myfile.test';
      const fileContent = 'content';
      const result = fileResponseFactory.file({
        body: fileContent,
        filename,
        headers: { ...extraHeaders, ...overrideHeaders },
      });
      expect(result.options.headers).toEqual(
        expect.objectContaining({
          ...extraHeaders,
          'content-disposition': `attachment; filename=${filename}`,
          'content-length': `${fileContent.length}`,
        })
      );
    });

    describe('content-type', () => {
      it('default mime type octet-stream', () => {
        const result = fileResponseFactory.file({ body: 'content', filename: 'myfile.unknown' });
        expect(result.options.headers).toHaveProperty('content-type', 'application/octet-stream');
      });
      it('gets mime type from filename', () => {
        const result = fileResponseFactory.file({ body: 'content', filename: 'myfile.mp4' });
        expect(result.options.headers).toHaveProperty('content-type', 'video/mp4');
      });
      it('gets accepts contentType override', () => {
        const result = fileResponseFactory.file({
          body: 'content',
          filename: 'myfile.mp4',
          fileContentType: 'custom',
        });
        expect(result.options.headers).toHaveProperty('content-type', 'custom');
      });
    });
  });
});
