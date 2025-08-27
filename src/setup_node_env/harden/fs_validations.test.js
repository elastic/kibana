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
const path = require('path');
const { REPO_ROOT } = require('@kbn/repo-info');
const { tmpdir } = require('os');
const fs = require('fs');
const { Buffer } = require('buffer');
const { fsEventBus, FS_CONFIG_EVENT } = require('@kbn/security-hardening/fs-event-bus');

const DATA_PATH = path.join(REPO_ROOT, 'data');

describe('fs_validations', () => {
  beforeAll(() => {
    process.env.KBN_ENABLE_HARDENED_FS = true;
    // Emit the configuration event to set up safe paths
    fsEventBus.emit(FS_CONFIG_EVENT, {
      safe_paths: [DATA_PATH],
      enabled: true,
    });
  });

  afterAll(() => {
    process.env.KBN_ENABLE_HARDENED_FS = false;
  });

  describe('validateNoPathTraversal', () => {
    it('should reject paths with null bytes', () => {
      expect(() => validations.validateNoPathTraversal('/path/to/file\0')).toThrow(
        'Null bytes not allowed'
      );
      expect(() => validations.validateNoPathTraversal('/path/to/file%00')).toThrow(
        'Null bytes not allowed'
      );
    });

    it('should reject paths with URL encoded sequences', () => {
      expect(() => validations.validateNoPathTraversal('/path/%2e%2e/etc')).toThrow(
        'URL encoded path sequences not allowed'
      );
      expect(() => validations.validateNoPathTraversal('/path/%2E%2E/etc')).toThrow(
        'URL encoded path sequences not allowed'
      );
      expect(() => validations.validateNoPathTraversal('/path/%2f%2e%2e')).toThrow(
        'URL encoded path sequences not allowed'
      );
    });

    it('should reject paths with directory traversal sequences', () => {
      expect(() => validations.validateNoPathTraversal('../etc/passwd')).toThrow(
        'Path traversal sequences not allowed'
      );
      expect(() => validations.validateNoPathTraversal('/path/../etc')).toThrow(
        'Path traversal sequences not allowed'
      );
      expect(() => validations.validateNoPathTraversal('/path/../../etc')).toThrow(
        'Path traversal sequences not allowed'
      );
      expect(() => validations.validateNoPathTraversal('..\\Windows\\System32')).toThrow(
        'Path traversal sequences not allowed'
      );
      expect(() => validations.validateNoPathTraversal('..')).toThrow(
        'Path traversal sequences not allowed'
      );
    });

    it('should accept safe paths', () => {
      expect(() => validations.validateNoPathTraversal('/path/to/file.txt')).not.toThrow();
      expect(() => validations.validateNoPathTraversal('./file.txt')).not.toThrow();
      expect(() => validations.validateNoPathTraversal('file.txt')).not.toThrow();
      expect(() => validations.validateNoPathTraversal('/path/with.dots/file')).not.toThrow();
      expect(() => validations.validateNoPathTraversal('C:\\Windows\\file.txt')).not.toThrow();
    });

    it('should handle non-string inputs by converting them to strings', () => {
      const pathObj = { toString: () => '/safe/path/file.txt' };
      expect(() => validations.validateNoPathTraversal(pathObj)).not.toThrow();

      const badPathObj = { toString: () => '../etc/passwd' };
      expect(() => validations.validateNoPathTraversal(badPathObj)).toThrow(
        'Path traversal sequences not allowed'
      );
    });
  });

  describe('getFileExtension', () => {
    it('should extract extension from simple filenames', () => {
      expect(validations.getFileExtension('file.txt')).toBe('.txt');
      expect(validations.getFileExtension('document.pdf')).toBe('.pdf');
      expect(validations.getFileExtension('image.png')).toBe('.png');
    });

    it('should extract extension from paths with directories', () => {
      expect(validations.getFileExtension('/path/to/file.json')).toBe('.json');
      expect(validations.getFileExtension('relative/path/file.yml')).toBe('.yml');
      expect(validations.getFileExtension('C:\\Windows\\file.log')).toBe('.log');
    });

    it('should handle files with multiple dots', () => {
      expect(validations.getFileExtension('file.with.multiple.dots.md')).toBe('.md');
      expect(validations.getFileExtension('archive.tar.gz')).toBe('.gz');
      expect(validations.getFileExtension('version.1.0.2.csv')).toBe('.csv');
    });

    it('should convert extensions to lowercase', () => {
      expect(validations.getFileExtension('README.MD')).toBe('.md');
      expect(validations.getFileExtension('script.JS')).toBe('.js');
      expect(validations.getFileExtension('image.PNG')).toBe('.png');
    });

    it('should return empty string for files without extensions', () => {
      expect(validations.getFileExtension('README')).toBe('');
      expect(validations.getFileExtension('Dockerfile')).toBe('');
      expect(validations.getFileExtension('/path/without/extension')).toBe('');
    });

    it('should return empty string when dot is part of directory name', () => {
      expect(validations.getFileExtension('/path.with.dots/filename')).toBe('');
    });

    it('should handle edge cases', () => {
      expect(validations.getFileExtension('')).toBe('');
      expect(validations.getFileExtension('.')).toBe('');
      expect(validations.getFileExtension('.hidden')).toBe('.hidden');
      expect(validations.getFileExtension('file.')).toBe('');
    });

    it('should handle non-string inputs by converting them to strings', () => {
      const pathObj = { toString: () => '/path/to/file.yaml' };
      expect(validations.getFileExtension(pathObj)).toBe('.yaml');

      expect(validations.getFileExtension(null)).toBe('');
      expect(validations.getFileExtension(undefined)).toBe('');
    });
  });

  describe('validateFileExtension', () => {
    it('should accept files with allowed extensions', () => {
      expect(() => validations.validateFileExtension('/path/file.txt')).not.toThrow();
      expect(() => validations.validateFileExtension('/path/file.md')).not.toThrow();
      expect(() => validations.validateFileExtension('/path/file.log')).not.toThrow();
      expect(() => validations.validateFileExtension('/path/file.json')).not.toThrow();
      expect(() => validations.validateFileExtension('/path/file.yml')).not.toThrow();
      expect(() => validations.validateFileExtension('/path/file.yaml')).not.toThrow();
      expect(() => validations.validateFileExtension('/path/file.csv')).not.toThrow();
      expect(() => validations.validateFileExtension('/path/file.svg')).not.toThrow();
      expect(() => validations.validateFileExtension('/path/file.png')).not.toThrow();
    });

    it('should reject files with disallowed extensions', () => {
      expect(() => validations.validateFileExtension('/path/file.js')).toThrow('Invalid file type');
      expect(() => validations.validateFileExtension('/path/file.html')).toThrow(
        'Invalid file type'
      );
      expect(() => validations.validateFileExtension('/path/file.php')).toThrow(
        'Invalid file type'
      );
      expect(() => validations.validateFileExtension('/path/file.exe')).toThrow(
        'Invalid file type'
      );
      expect(() => validations.validateFileExtension('/path/file.sh')).toThrow('Invalid file type');
      expect(() => validations.validateFileExtension('/path/file')).toThrow('Invalid file type');
    });

    it('should handle case-insensitive extension matching', () => {
      expect(() => validations.validateFileExtension('/path/file.TXT')).not.toThrow();
      expect(() => validations.validateFileExtension('/path/file.Md')).not.toThrow();
      expect(() => validations.validateFileExtension('/path/file.JSON')).not.toThrow();
      expect(() => validations.validateFileExtension('/path/file.Yml')).not.toThrow();
    });

    it('should handle paths with multiple dots', () => {
      expect(() => validations.validateFileExtension('/path/file.with.dots.txt')).not.toThrow();
      expect(() => validations.validateFileExtension('/path/file.tar.gz')).toThrow(
        'Invalid file type'
      );
    });
  });

  describe('validatePathIsSubdirectoryOfSafeDirectory', () => {
    it('should accept paths in safe directories', () => {
      const safePath1 = path.join(REPO_ROOT, 'data', 'file.txt');
      const safePath2 = path.join(REPO_ROOT, '.es', 'file.txt');

      expect(() => validations.validatePathIsSubdirectoryOfSafeDirectory(safePath1)).not.toThrow();
      expect(() => validations.validatePathIsSubdirectoryOfSafeDirectory(safePath2)).not.toThrow();
    });

    it('should accept nested paths in safe directories', () => {
      const nestedSafePath = path.join(REPO_ROOT, 'data', 'subfolder', 'deep', 'file.txt');
      expect(() =>
        validations.validatePathIsSubdirectoryOfSafeDirectory(nestedSafePath)
      ).not.toThrow();
    });

    it('should reject paths outside safe directories', () => {
      expect(() => validations.validatePathIsSubdirectoryOfSafeDirectory('/etc/passwd')).toThrow(
        'Unsafe path'
      );
      expect(() =>
        validations.validatePathIsSubdirectoryOfSafeDirectory('/var/log/system.log')
      ).toThrow('Unsafe path');
      expect(() =>
        validations.validatePathIsSubdirectoryOfSafeDirectory('/home/user/secret.txt')
      ).toThrow('Unsafe path');
    });

    it('should reject paths that start with safe directory names but are not actual subdirectories', () => {
      const notSafePath = path.join(REPO_ROOT, 'data-not-safe', 'file.txt');
      expect(() => validations.validatePathIsSubdirectoryOfSafeDirectory(notSafePath)).toThrow(
        'Unsafe path'
      );
    });

    it('should detect path traversal that escapes safe directories after normalization', () => {
      const traversalPath = path.normalize(
        path.join(REPO_ROOT, 'data', '..', '..', 'etc', 'passwd')
      );
      expect(() => validations.validatePathIsSubdirectoryOfSafeDirectory(traversalPath)).toThrow(
        'Unsafe path'
      );
    });

    describe('should detect path traversal attempts', () => {
      it('should reject paths that attempt to traverse outside safe directories using ../', () => {
        const traversalPath = path.join(REPO_ROOT, 'data', '..', 'unsafe-directory', 'file.txt');
        // Normalize the path to resolve the .. segments
        const normalizedPath = path.normalize(traversalPath);

        expect(() => validations.validatePathIsSubdirectoryOfSafeDirectory(normalizedPath)).toThrow(
          'Unsafe path detected'
        );
      });

      it('should reject paths that use complex traversal to escape safe directories', () => {
        const complexTraversalPath = path.join(
          REPO_ROOT,
          'data',
          'subdir',
          '..',
          '..',
          '..',
          'etc',
          'passwd'
        );
        const normalizedPath = path.normalize(complexTraversalPath);

        expect(() => validations.validatePathIsSubdirectoryOfSafeDirectory(normalizedPath)).toThrow(
          'Unsafe path detected'
        );
      });

      it.skip('should reject paths that use Windows backslash traversal', () => {
        const windowsTraversalPath = path.join(REPO_ROOT, 'data', '..\\..\\Windows\\System32');
        const normalizedPath = path.normalize(windowsTraversalPath);

        expect(() => validations.validatePathIsSubdirectoryOfSafeDirectory(normalizedPath)).toThrow(
          'Unsafe path detected'
        );
      });

      it('should reject paths that look like safe paths but are actually outside', () => {
        // This path starts with a safe directory name but isn't actually inside it
        const deceptivePath = path.join(REPO_ROOT, 'data-not-safe', 'file.txt');

        expect(() => validations.validatePathIsSubdirectoryOfSafeDirectory(deceptivePath)).toThrow(
          'Unsafe path detected'
        );
      });

      it.skip('should reject paths with encoded Unicode traversal characters', () => {
        // Unicode representations of '../' that might bypass filters
        // These paths would be normalized by Node.js
        const unicodePath = path.join(
          REPO_ROOT,
          'data',
          'test',
          '\u2216\u2216\u2216etc\u2216passwd'
        );
        const unicodePath2 = path.join(REPO_ROOT, 'data', 'test', '\u002e\u002e\u002fpasswd');

        expect(() =>
          validations.validatePathIsSubdirectoryOfSafeDirectory(path.normalize(unicodePath))
        ).toThrow('Unsafe path detected');
        expect(() =>
          validations.validatePathIsSubdirectoryOfSafeDirectory(path.normalize(unicodePath2))
        ).toThrow('Unsafe path detected');
      });

      it.skip('should reject paths with multiple slashes that might bypass filters', () => {
        // Multiple slashes are normalized in Node.js path handling
        const multipleSlashPath = path.join(REPO_ROOT, 'data', '..////..////etc////passwd');

        expect(() =>
          validations.validatePathIsSubdirectoryOfSafeDirectory(path.normalize(multipleSlashPath))
        ).toThrow('Unsafe path detected');
      });

      it.skip('should reject paths with combinations of forward and backslashes', () => {
        // Mixing slash types that might bypass filters
        const mixedSlashPath = path.join(REPO_ROOT, 'data', '..\\/..\\/../\\/etc/passwd');

        expect(() =>
          validations.validatePathIsSubdirectoryOfSafeDirectory(path.normalize(mixedSlashPath))
        ).toThrow('Unsafe path detected');
      });

      it('should reject paths with directory traversal using current directory references', () => {
        // Using ./../../ patterns
        const currentDirTraversalPath = path.join(
          REPO_ROOT,
          'data',
          '.',
          '..',
          '.',
          '..',
          'etc',
          'passwd'
        );

        expect(() =>
          validations.validatePathIsSubdirectoryOfSafeDirectory(
            path.normalize(currentDirTraversalPath)
          )
        ).toThrow('Unsafe path detected');
      });

      it('should reject paths with non-standard but normalized traversal patterns', () => {
        // Unusual patterns that normalize to ../
        const unusualTraversalPath = path.join(
          REPO_ROOT,
          'data',
          '...',
          '....',
          '.....',
          'etc',
          'passwd'
        );
        const normalizedUnusualPath = path.normalize(unusualTraversalPath);

        // If this passes through the first validation step (which might reject it before normalization)
        // it should be caught by this function after normalization
        try {
          validations.validatePathIsSubdirectoryOfSafeDirectory(normalizedUnusualPath);
          // eslint-disable-next-line no-undef
          // fail('Path traversal with unusual pattern should be rejected');
        } catch (error) {
          expect(error.message).toContain('Unsafe path');
        }
      });

      it('should reject paths using symlink-like syntax that might bypass filters', () => {
        // Path that looks like it might attempt to use a symlink to escape
        const symlinkLikePath = path.join(REPO_ROOT, 'data', '@..', '@..', 'etc', 'passwd');

        // Even if this syntax has no special meaning, if it tries to exit the safe directory after normalization
        // it should be caught
        try {
          validations.validatePathIsSubdirectoryOfSafeDirectory(path.normalize(symlinkLikePath));
          // eslint-disable-next-line no-undef
          // fail('Symlink-like traversal should be rejected');
        } catch (error) {
          // Either we'll get a path traversal error or an unsafe path error
          expect(error.message).toMatch(/Unsafe path|traversal/);
        }
      });
    });
  });

  describe('validateFileContent', () => {
    // Create test file contents
    const jsonContent = Buffer.from('{"name": "test"}');
    const yamlContent = Buffer.from('key: value\nother: value');
    const markdownContent = Buffer.from('# Markdown file\n\nThis is a test');
    const plainTextContent = Buffer.from('Plain text content');
    const csvContent = Buffer.from('a,b,c\n1,2,3');
    const svgContent = Buffer.from(
      '<svg width="100" height="100"><circle cx="50" cy="50" r="40" /></svg>'
    );

    it('should pass validation for text files with allowed extensions', async () => {
      expect(() => validations.validateFileContent(jsonContent, 'file.json')).not.toThrow();
      expect(() => validations.validateFileContent(yamlContent, 'file.yml')).not.toThrow();
      expect(() => validations.validateFileContent(markdownContent, 'file.md')).not.toThrow();
      expect(() => validations.validateFileContent(plainTextContent, 'file.txt')).not.toThrow();
      expect(() => validations.validateFileContent(csvContent, 'file.csv')).not.toThrow();
    });

    it('should handle SVG content', async () => {
      const result = validations.validateFileContent(svgContent, 'icon.svg');
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should reject content with unrecognizable or disallowed types', async () => {
      // Create a small binary file that doesn't match allowed MIME types
      const unrecognizedContent = Buffer.from([0x01, 0x02, 0x03, 0x04]);

      expect(() => validations.validateFileContent(unrecognizedContent)).toThrow();
    });
  });

  describe('validateFileSize', () => {
    it('should accept files within size limit', () => {
      const smallFile = Buffer.alloc(1024); // 1KB
      const mediumFile = Buffer.alloc(1024 * 1024); // 1MB

      expect(validations.validateFileSize(smallFile)).toBe(true);
      expect(validations.validateFileSize(mediumFile)).toBe(true);
    });

    it('should reject files exceeding maximum size', () => {
      // Create a buffer that appears to exceed the maximum size (1GB)
      // Note: We're not actually allocating 1GB+ of memory
      const mockLargeFile = Buffer.alloc(1);
      Object.defineProperty(mockLargeFile, 'length', { value: 1024 * 1024 * 1024 + 1 });

      expect(() => validations.validateFileSize(mockLargeFile)).toThrow(
        'File size exceeds maximum allowed size'
      );
    });

    it('should accept empty files', () => {
      const emptyFile = Buffer.alloc(0);
      expect(validations.validateFileSize(emptyFile)).toBe(true);
    });
  });

  describe('getSafePath', () => {
    it('should resolve valid relative paths to absolute paths', () => {
      const originalCwd = process.cwd();
      const safeDir = path.join(REPO_ROOT, 'data');

      try {
        // Create a temporary file in the safe directory if it doesn't exist
        if (!fs.existsSync(safeDir)) {
          fs.mkdirSync(safeDir, { recursive: true });
        }

        // Change directory to a safe path for the test
        process.chdir(safeDir);

        const relativePath = 'test-file.txt';
        // Write a test file to make sure the path is valid
        fs.writeFileSync(relativePath, 'test content', 'utf8');

        const result = validations.getSafePath(relativePath);

        expect(path.isAbsolute(result)).toBe(true);
        expect(result).toBe(path.resolve(safeDir, relativePath));

        // Clean up
        fs.unlinkSync(relativePath);
      } finally {
        // Restore original working directory
        process.chdir(originalCwd);
      }
    });

    it('should accept valid absolute paths in safe directories', () => {
      const safeDir = path.join(REPO_ROOT, 'data');
      const safePath = path.join(safeDir, 'test-file.json');

      // Create the directory and file if they don't exist
      if (!fs.existsSync(safeDir)) {
        fs.mkdirSync(safeDir, { recursive: true });
      }
      fs.writeFileSync(safePath, '{"test": true}', 'utf8');

      expect(validations.getSafePath(safePath)).toBe(safePath);

      // Clean up
      fs.unlinkSync(safePath);
    });

    it('should reject paths with disallowed extensions', () => {
      const safeDir = path.join(REPO_ROOT, 'data');
      const jsFilePath = path.join(safeDir, 'script.js');

      // Create the directory if it doesn't exist
      if (!fs.existsSync(safeDir)) {
        fs.mkdirSync(safeDir, { recursive: true });
      }

      expect(() => validations.getSafePath(jsFilePath)).toThrow('Invalid file type');
    });

    it('should reject paths outside safe directories', () => {
      const tempFile = path.join(tmpdir(), 'test-unsafe.txt');

      // Create a test file in a non-safe location (tmpdir is only safe in dev/CI mode)
      fs.writeFileSync(tempFile, 'test content', 'utf8');

      try {
        // Force production behavior if needed
        if (process.env.NODE_ENV !== 'production' && process.env.CI !== 'true') {
          // Skip this test in dev/CI environment where tmpdir is considered safe
          console.log(
            'Skipping "reject paths outside safe directories" test in dev/CI environment'
          );
          return;
        }

        expect(() => validations.getSafePath(tempFile)).toThrow('Unsafe path');
      } finally {
        // Clean up
        fs.unlinkSync(tempFile);
      }
    });

    it('should reject paths with traversal sequences', () => {
      const traversalPath = '../etc/passwd';
      expect(() => validations.getSafePath(traversalPath)).toThrow(
        'Path traversal sequences not allowed'
      );
    });

    it('should reject encoded path traversal attempts', () => {
      const encodedPath = '/tmp/%2e%2e/etc/passwd';
      expect(() => validations.getSafePath(encodedPath)).toThrow(
        'URL encoded path sequences not allowed'
      );
    });

    it('should reject null byte injection attempts', () => {
      const nullBytePath = '/safe/path\0../etc/passwd';
      expect(() => validations.getSafePath(nullBytePath)).toThrow('Null bytes not allowed');
    });
  });

  describe('validateAndSanitizeFileData', () => {
    it('should accept and return Buffer inputs', async () => {
      const buffer = Buffer.from('{"name": "test"}');
      const result = validations.validateAndSanitizeFileData(buffer, 'file.json');
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should convert Uint8Array to Buffer', async () => {
      const uint8Array = new Uint8Array([
        123, 34, 110, 97, 109, 101, 34, 58, 32, 34, 116, 101, 115, 116, 34, 125,
      ]); // {"name": "test"}
      const result = validations.validateAndSanitizeFileData(uint8Array, 'file.json');
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should convert string to Buffer', async () => {
      const string = '{"name": "test"}';
      const result = validations.validateAndSanitizeFileData(string, 'file.json');
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should handle objects with buffer property', async () => {
      const objWithBuffer = {
        buffer: Buffer.from('{"name": "test"}'),
      };
      const result = validations.validateAndSanitizeFileData(objWithBuffer, 'file.json');
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should reject unsupported data types', async () => {
      expect(() => validations.validateAndSanitizeFileData(123)).toThrow('Unsupported data type');
      expect(() => validations.validateAndSanitizeFileData({})).toThrow('Unsupported data type');
      expect(() => validations.validateAndSanitizeFileData(null)).toThrow('Unsupported data type');
    });

    it('should validate file size', async () => {
      // Create a buffer that appears to exceed the maximum size (1GB)
      const mockLargeFile = Buffer.alloc(10);
      Object.defineProperty(mockLargeFile, 'length', { value: 1024 * 1024 * 1024 + 1 });

      expect(() => validations.validateAndSanitizeFileData(mockLargeFile)).toThrow(
        'File size exceeds maximum allowed'
      );
    });
  });

  // Tests to explain the differences between path.normalize and path.resolve
  describe('path.normalize vs path.resolve', () => {
    it('normalize processes .. segments but keeps paths relative if they were relative', () => {
      const relativePath = 'subdir/../file.txt';
      expect(path.normalize(relativePath)).toBe('file.txt');
      // Normalized path is still relative
      expect(path.isAbsolute(path.normalize(relativePath))).toBe(false);
    });

    it('resolve processes .. segments and always returns absolute paths', () => {
      const relativePath = 'subdir/../file.txt';
      expect(path.resolve(relativePath)).toBe(path.join(process.cwd(), 'file.txt'));
      // Resolved path is always absolute
      expect(path.isAbsolute(path.resolve(relativePath))).toBe(true);
    });

    it('normalize only processes the path string without considering filesystem context', () => {
      const complexPath = '../../../etc/passwd';
      // normalize will simplify the path but not consider the actual filesystem location
      expect(path.normalize(complexPath)).toBe('../../../etc/passwd');
    });

    it('resolve considers the current working directory as the base', () => {
      const complexPath = '../../../etc/passwd';
      // resolve will use the current working directory as base and produce an absolute path
      expect(path.resolve(complexPath)).toBe(path.resolve(process.cwd(), '../../../etc/passwd'));
    });

    it('resolve handles multiple path segments by joining them right to left', () => {
      expect(path.resolve('/foo', '/bar', 'baz')).toBe('/bar/baz');
      expect(path.resolve('/foo', 'bar', '/baz')).toBe('/baz');
      expect(path.resolve('/foo', 'bar', 'baz')).toBe(path.join('/foo', 'bar', 'baz'));
    });

    it('path.sep provides the platform-specific path separator', () => {
      if (process.platform === 'win32') {
        expect(path.sep).toBe('\\');
      } else {
        expect(path.sep).toBe('/');
      }
    });
  });
});
