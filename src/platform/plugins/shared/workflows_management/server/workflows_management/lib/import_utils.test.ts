/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import AdmZip from 'adm-zip';
import { Readable } from 'stream';
import { detectFileFormat, isValidWorkflowId, readStreamToBuffer } from './import_utils';

describe('detectFileFormat', () => {
  it('should detect a ZIP archive by magic bytes', async () => {
    const zip = new AdmZip();
    zip.addFile('test/manifest.yml', Buffer.from('version: 1'));
    const buffer = await zip.toBufferPromise();
    expect(detectFileFormat(buffer)).toBe('zip');
  });

  it('should detect YAML content', () => {
    const buffer = Buffer.from('name: My Workflow\nsteps: []', 'utf-8');
    expect(detectFileFormat(buffer)).toBe('yaml');
  });

  it('should detect YAML for JSON-like content (not ZIP)', () => {
    const buffer = Buffer.from('{"name": "test"}', 'utf-8');
    expect(detectFileFormat(buffer)).toBe('yaml');
  });

  it('should detect YAML for empty buffer', () => {
    expect(detectFileFormat(Buffer.alloc(0))).toBe('yaml');
  });

  it('should detect YAML for single-byte buffer', () => {
    expect(detectFileFormat(Buffer.from([0x50]))).toBe('yaml');
  });

  it('should detect ZIP even with minimal 2-byte PK header', () => {
    expect(detectFileFormat(Buffer.from([0x50, 0x4b]))).toBe('zip');
  });

  it('should detect YAML for content with BOM character', () => {
    const buffer = Buffer.from('\uFEFFname: Test', 'utf-8');
    expect(detectFileFormat(buffer)).toBe('yaml');
  });

  it('should detect YAML for content with null bytes', () => {
    const buffer = Buffer.from('\x00name: Test', 'utf-8');
    expect(detectFileFormat(buffer)).toBe('yaml');
  });
});

describe('isValidWorkflowId', () => {
  it('should accept alphanumeric IDs with hyphens, dots, and underscores', () => {
    expect(isValidWorkflowId('my-workflow-123')).toBe(true);
    expect(isValidWorkflowId('Workflow_v2.0')).toBe(true);
    expect(isValidWorkflowId('a')).toBe(true);
  });

  it('should reject prototype pollution keys', () => {
    expect(isValidWorkflowId('__proto__')).toBe(false);
    expect(isValidWorkflowId('constructor')).toBe(false);
    expect(isValidWorkflowId('prototype')).toBe(false);
  });

  it('should reject empty strings', () => {
    expect(isValidWorkflowId('')).toBe(false);
  });

  it('should reject IDs starting with special characters', () => {
    expect(isValidWorkflowId('-leading-hyphen')).toBe(false);
    expect(isValidWorkflowId('.dotfile')).toBe(false);
  });

  it('should reject IDs with spaces or special characters', () => {
    expect(isValidWorkflowId('has spaces')).toBe(false);
    expect(isValidWorkflowId('has@symbol')).toBe(false);
    expect(isValidWorkflowId('path/traversal')).toBe(false);
  });

  it('should reject IDs longer than 255 characters', () => {
    expect(isValidWorkflowId('a'.repeat(256))).toBe(false);
    expect(isValidWorkflowId('a'.repeat(255))).toBe(true);
  });
});

describe('readStreamToBuffer', () => {
  it('should collect stream chunks into a single buffer', async () => {
    const stream = Readable.from([Buffer.from('hello '), Buffer.from('world')]);
    const result = await readStreamToBuffer(stream);
    expect(result.toString('utf-8')).toBe('hello world');
  });

  it('should handle empty streams', async () => {
    const stream = Readable.from([]);
    const result = await readStreamToBuffer(stream);
    expect(result.length).toBe(0);
  });

  it('should reject on stream error', async () => {
    const stream = new Readable({
      read() {
        this.destroy(new Error('Stream failure'));
      },
    });
    await expect(readStreamToBuffer(stream)).rejects.toThrow('Stream failure');
  });
});
