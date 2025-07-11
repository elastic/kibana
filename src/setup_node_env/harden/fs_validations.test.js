/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-restricted-syntax */

// eslint-disable-next-line @kbn/imports/uniform_imports
const validations = require('./fs_validations');

describe('validations', () => {
  describe('validateNoPathTraversal', () => {
    describe('should throw for null bytes', () => {
      it('rejects paths with null bytes (\\0)', () => {
        expect(() => validations.validateNoPathTraversal('/tmp/file\0.txt')).toThrow(
          'Null bytes not allowed in paths'
        );
      });

      it('rejects paths with URL-encoded null bytes (%00)', () => {
        expect(() => validations.validateNoPathTraversal('/tmp/file%00.txt')).toThrow(
          'Null bytes not allowed in paths'
        );
      });
    });

    describe('should throw for URL-encoded path sequences', () => {
      it('rejects paths with URL-encoded dots (%2e)', () => {
        expect(() => validations.validateNoPathTraversal('/tmp/%2e%2e/etc/passwd')).toThrow(
          'URL encoded path sequences not allowed'
        );
      });

      it('rejects paths with URL-encoded slashes (%2f)', () => {
        expect(() => validations.validateNoPathTraversal('/tmp%2fetc%2fpasswd')).toThrow(
          'URL encoded path sequences not allowed'
        );
      });

      it('rejects paths with mixed case URL encodings (%2E)', () => {
        expect(() => validations.validateNoPathTraversal('/tmp/%2E%2E/etc/passwd')).toThrow(
          'URL encoded path sequences not allowed'
        );
      });
    });

    describe('should throw for path traversal patterns', () => {
      it('rejects simple path traversal (../)', () => {
        expect(() => validations.validateNoPathTraversal('../etc/passwd')).toThrow(
          'Path traversal sequences not allowed'
        );
      });

      it('rejects path traversal with windows backslash (..\\)', () => {
        expect(() => validations.validateNoPathTraversal('..\\Windows\\System32\\config')).toThrow(
          'Path traversal sequences not allowed'
        );
      });

      it('rejects path traversal in the middle of a path', () => {
        expect(() => validations.validateNoPathTraversal('/tmp/../etc/passwd')).toThrow(
          'Path traversal sequences not allowed'
        );
      });

      it('rejects multiple consecutive path traversal sequences', () => {
        expect(() => validations.validateNoPathTraversal('../../etc/passwd')).toThrow(
          'Path traversal sequences not allowed'
        );
      });

      it('rejects standalone double dots', () => {
        expect(() => validations.validateNoPathTraversal('..')).toThrow(
          'Path traversal sequences not allowed'
        );
      });
    });

    describe('should accept safe paths', () => {
      it('accepts simple relative path', () => {
        expect(() => validations.validateNoPathTraversal('file.txt')).not.toThrow();
      });

      it('accepts simple absolute path', () => {
        expect(() => validations.validateNoPathTraversal('/tmp/file.txt')).not.toThrow();
      });

      it('accepts path with single dots', () => {
        expect(() => validations.validateNoPathTraversal('./file.txt')).not.toThrow();
      });

      it('accepts path with dots in filename', () => {
        expect(() => validations.validateNoPathTraversal('file.with.dots.txt')).not.toThrow();
      });

      it('accepts path with dots in directory name', () => {
        expect(() => validations.validateNoPathTraversal('/dir.name/file.txt')).not.toThrow();
      });

      it('accepts path with special characters', () => {
        expect(() =>
          validations.validateNoPathTraversal('/tmp/file-name_with.special@chars.txt')
        ).not.toThrow();
      });
    });
  });

  describe.skip('validateFileExtension', () => {});

  describe.skip('validatePathIsSubdirectoryOfSafeDirectory', () => {});

  describe.skip('validateFileContent', () => {
    // Create sample file contents for testing
    const createTextFileContent = () => Buffer.from('Hello world, this is a text file');
    const createJsonFileContent = () => Buffer.from('{"key": "value"}');
    const createYamlFileContent = () => Buffer.from('key: value\nanother_key: another_value');
    const createMarkdownFileContent = () => Buffer.from('# Heading\n\nThis is markdown content.');
    const createCsvFileContent = () => Buffer.from('header1,header2\nvalue1,value2');

    // Create binary file contents that should be rejected
    const createExecutableFileContent = () => {
      // Create a minimal ELF header that magic-bytes will recognize as executable
      return Buffer.from([
        0x7f,
        0x45,
        0x4c,
        0x46, // Magic number for ELF
        0x02,
        0x01,
        0x01,
        0x00, // More header bytes
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
      ]);
    };

    const createPngImageFileContent = () => {
      // Create a minimal PNG header that magic-bytes will recognize
      return Buffer.from([
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a, // PNG signature
        0x00,
        0x00,
        0x00,
        0x0d, // IHDR chunk length
        0x49,
        0x48,
        0x44,
        0x52, // IHDR chunk type
        0x00,
        0x00,
        0x00,
        0x01, // Width: 1px
        0x00,
        0x00,
        0x00,
        0x01, // Height: 1px
        0x08,
        0x02,
        0x00,
        0x00,
        0x00, // Bit depth, color type, etc.
      ]);
    };

    const createPdfFileContent = () => {
      // Create a minimal PDF header
      return Buffer.from('%PDF-1.5\n%¥±ë\n');
    };

    // These tests are just to solidify my understanding of magic-bytes
    describe.skip('magic-bytes cant do text-based file detection', () => {
      it('cannot detect text file', () => {
        const content = createTextFileContent();
        // Plain text files don't have magic bytes, so the library can't detect them
        expect(() => validations.validateFileContent(content)).toThrow(
          /Unable to determine content types/
        );
      });

      it('cannot detect yaml file', () => {
        const content = createYamlFileContent();
        // YAML files don't have magic bytes, so the library can't detect them
        expect(() => validations.validateFileContent(content)).toThrow(
          /Unable to determine content types/
        );
      });

      it('cannot detect markdown', () => {
        const content = createMarkdownFileContent();
        // Markdown files don't have magic bytes, so the library can't detect them
        expect(() => validations.validateFileContent(content)).toThrow(
          /Unable to determine content types/
        );
      });

      it('cannot detect csv', () => {
        const content = createCsvFileContent();
        // CSV files don't have magic bytes, so the library can't detect them
        expect(() => validations.validateFileContent(content)).toThrow(
          /Unable to determine content types/
        );
      });

      it('validates JSON file content as it has recognizable structure', () => {
        const content = createJsonFileContent();
        expect(() => validations.validateFileContent(content)).not.toThrow();
      });
    });

    describe('should throw for disallowed content types', () => {
      it('throws for executable file content', () => {
        const content = createExecutableFileContent();
        expect(() => validations.validateFileContent(content)).toThrow(
          'Potential invalid mimetypes detected: "application/vnd.rar, application/x-executable". Allowed mimetypes: text/plain, text/markdown, application/json, text/yaml, text/csv'
        );
      });

      it('throws for PNG image file content', () => {
        const content = createPngImageFileContent();
        expect(() => validations.validateFileContent(content)).toThrow(
          'Potential invalid mimetypes detected: "image/png, image/apng". Allowed mimetypes: text/plain, text/markdown, application/json, text/yaml, text/csv'
        );
      });

      it('throws for PDF file content', () => {
        const content = createPdfFileContent();
        expect(() => validations.validateFileContent(content)).toThrow(
          'Potential invalid mimetypes detected: "application/pdf". Allowed mimetypes: text/plain, text/markdown, application/json, text/yaml, text/csv'
        );
      });

      it('throws when no file types can be detected', () => {
        // Create a buffer with random bytes that shouldn't match any known file signature
        const content = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0]);
        expect(() => validations.validateFileContent(content)).toThrow(
          /Unable to determine content types/
        );
      });
    });
  });
});
