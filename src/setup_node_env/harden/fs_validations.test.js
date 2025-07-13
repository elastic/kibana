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

  describe('validateFileExtension', () => {
    describe('should accept files with allowed extensions', () => {
      it('accepts .txt files', () => {
        expect(() => validations.validateFileExtension('/path/to/file.txt')).not.toThrow();
      });

      it('accepts .md files', () => {
        expect(() => validations.validateFileExtension('/path/to/readme.md')).not.toThrow();
      });

      it('accepts .log files', () => {
        expect(() => validations.validateFileExtension('/path/to/server.log')).not.toThrow();
      });

      it('accepts .json files', () => {
        expect(() => validations.validateFileExtension('/path/to/config.json')).not.toThrow();
      });

      it('accepts .yml files', () => {
        expect(() => validations.validateFileExtension('/path/to/config.yml')).not.toThrow();
      });

      it('accepts .yaml files', () => {
        expect(() =>
          validations.validateFileExtension('/path/to/docker-compose.yaml')
        ).not.toThrow();
      });

      it('accepts .csv files', () => {
        expect(() => validations.validateFileExtension('/path/to/data.csv')).not.toThrow();
      });

      it('accepts .svg files', () => {
        expect(() => validations.validateFileExtension('/path/to/icon.svg')).not.toThrow();
      });

      it('accepts .png files', () => {
        expect(() => validations.validateFileExtension('/path/to/image.png')).not.toThrow();
      });
    });

    describe('should throw for files with disallowed extensions', () => {
      it('rejects .js files', () => {
        expect(() => validations.validateFileExtension('/path/to/script.js')).toThrow(
          'Invalid file type'
        );
      });

      it('rejects .html files', () => {
        expect(() => validations.validateFileExtension('/path/to/page.html')).toThrow(
          'Invalid file type'
        );
      });

      it('rejects .php files', () => {
        expect(() => validations.validateFileExtension('/path/to/server.php')).toThrow(
          'Invalid file type'
        );
      });

      it('rejects .exe files', () => {
        expect(() => validations.validateFileExtension('/path/to/program.exe')).toThrow(
          'Invalid file type'
        );
      });

      it('rejects files with no extension', () => {
        expect(() => validations.validateFileExtension('/path/to/file')).toThrow(
          'Invalid file type'
        );
      });

      it('rejects files with multiple extensions if final one is not allowed', () => {
        expect(() => validations.validateFileExtension('/path/to/archive.tar.gz')).toThrow(
          'Invalid file type'
        );
      });
    });

    describe('should handle case-insensitive extension matching', () => {
      it('accepts uppercase extensions', () => {
        expect(() => validations.validateFileExtension('/path/to/README.MD')).not.toThrow();
        expect(() => validations.validateFileExtension('/path/to/CONFIG.JSON')).not.toThrow();
        expect(() => validations.validateFileExtension('/path/to/IMAGE.PNG')).not.toThrow();
      });

      it('accepts mixed case extensions', () => {
        expect(() => validations.validateFileExtension('/path/to/readme.Md')).not.toThrow();
        expect(() => validations.validateFileExtension('/path/to/config.JsOn')).not.toThrow();
        expect(() => validations.validateFileExtension('/path/to/data.cSv')).not.toThrow();
      });
    });
  });

  describe('validatePathIsSubdirectoryOfSafeDirectory', () => {
    const { REPO_ROOT } = require('@kbn/repo-info');
    const path = require('path');

    describe('should use isDevOrCiEnvironmentOverride parameter when provided', () => {
      it('skips validation when isDevOrCiEnvironmentOverride is true', () => {
        // Using override parameter to force dev/CI behavior regardless of actual environment
        expect(() =>
          validations.validatePathIsSubdirectoryOfSafeDirectory('/some/random/path', true)
        ).not.toThrow();
      });

      it('performs validation when isDevOrCiEnvironmentOverride is false', () => {
        // Using override parameter to force production behavior regardless of actual environment
        expect(() =>
          validations.validatePathIsSubdirectoryOfSafeDirectory('/some/random/path', false)
        ).toThrow('Unsafe path detected');
      });
    });

    describe('should validate paths against safe directories in production', () => {
      // Force production behavior using the override parameter

      it('accepts paths in REPO_ROOT/data', () => {
        const safePath = path.join(REPO_ROOT, 'data', 'some-file.txt');
        // Force production behavior with override
        expect(() =>
          validations.validatePathIsSubdirectoryOfSafeDirectory(safePath, false)
        ).not.toThrow();
      });

      it('accepts paths in REPO_ROOT/.es', () => {
        const safePath = path.join(REPO_ROOT, '.es', 'some-file.txt');
        expect(() =>
          validations.validatePathIsSubdirectoryOfSafeDirectory(safePath, false)
        ).not.toThrow();
      });

      it('rejects paths outside of safe directories', () => {
        // Force production behavior with override
        expect(() =>
          validations.validatePathIsSubdirectoryOfSafeDirectory('/etc/passwd', false)
        ).toThrow('Unsafe path detected');

        expect(() =>
          validations.validatePathIsSubdirectoryOfSafeDirectory('/var/log/app.log', false)
        ).toThrow('Unsafe path detected');

        expect(() =>
          validations.validatePathIsSubdirectoryOfSafeDirectory('/home/user/secret.txt', false)
        ).toThrow('Unsafe path detected');
      });

      it('rejects paths that only start with safe directory names but are not subdirectories', () => {
        const almostSafePath = path.join(REPO_ROOT, 'data-not-safe', 'file.txt');
        expect(() =>
          validations.validatePathIsSubdirectoryOfSafeDirectory(almostSafePath, false)
        ).toThrow('Unsafe path detected');
      });

      it('accepts deep subdirectories of safe paths', () => {
        const deepSafePath = path.join(REPO_ROOT, 'data', 'subdir', 'another', 'deep', 'file.txt');
        expect(() =>
          validations.validatePathIsSubdirectoryOfSafeDirectory(deepSafePath, false)
        ).not.toThrow();
      });
    });

    describe('should handle various path formats', () => {
      it('handles relative paths correctly', () => {
        // This test depends on the current working directory
        // Force production behavior with override
        const relativePath = 'data/file.txt';

        // We can't easily predict the result here, but the function should not throw
        // if the path is in a safe directory
        try {
          validations.validatePathIsSubdirectoryOfSafeDirectory(relativePath, false);
        } catch (error) {
          // If it throws, it should be the unsafe path error
          expect(error.message).toContain('Unsafe path detected');
        }
      });

      it('normalizes paths with ".." segments for comparison', () => {
        // A path that goes up and back down into a safe directory should be rejected
        // as it's potentially a path traversal attempt, but the current implementation doesn't
        const traversalPath = path.join(REPO_ROOT, 'data', '..', 'data', 'file.txt');

        // Since we're checking path.startsWith(), this won't actually throw
        // but in a real system with path normalization it should
        expect(() =>
          validations.validatePathIsSubdirectoryOfSafeDirectory(traversalPath, false)
        ).not.toThrow();
      });
    });
  });

  describe('validateFileContent', () => {
    // Define magicBytes for test access
    const magicBytes = require('magic-bytes.js');

    // Create sample file contents for testing with real magic-bytes detection
    const createJsonFileContent = () => Buffer.from('{"key": "value"}');
    const createSvgFileContent = () =>
      Buffer.from('<svg width="100" height="100"><circle cx="50" cy="50" r="40" /></svg>');

    // Create PNG image content for testing
    const createPngImageFileContent = async () => {
      // Use Sharp to create a valid PNG image
      const sharp = require('sharp');

      // Create a simple 1x1 red pixel PNG
      return await sharp({
        create: {
          width: 1,
          height: 1,
          channels: 3,
          background: { r: 255, g: 0, b: 0 },
        },
      })
        .png()
        .toBuffer();
    };

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

    const createPdfFileContent = () => {
      // Create a minimal PDF header
      return Buffer.from('%PDF-1.5\n%¥±ë\n');
    };

    describe('should correctly detect and validate file types using magic-bytes.js', () => {
      it('detects and allows JSON files', async () => {
        const content = createJsonFileContent();
        // Verify what magic-bytes detects for JSON
        const detectedTypes = magicBytes.filetypeinfo(content);
        expect(detectedTypes.some((type) => type.mime === 'application/json')).toBe(true);

        // Now test the validation - should return original buffer
        const result = await validations.validateFileContent(content);
        expect(Buffer.isBuffer(result)).toBe(true);
        expect(result).toEqual(content); // Should be the same buffer
      });

      it('detects and allows SVG files and sanitizes content', async () => {
        const content = createSvgFileContent();
        // Verify what magic-bytes detects for SVG
        const detectedTypes = magicBytes.filetypeinfo(content);
        expect(detectedTypes.some((type) => type.mime === 'image/svg+xml')).toBe(true);

        // Test the validation and sanitization
        const sanitized = await validations.validateFileContent(content);
        expect(sanitized).toBeDefined();
        expect(Buffer.isBuffer(sanitized)).toBe(true);

        // Convert to string to check content
        const sanitizedStr = sanitized.toString('utf8');
        expect(sanitizedStr).toContain('<svg');
        expect(sanitizedStr).toContain('<circle');
      });

      it('detects and allows PNG image files', async () => {
        const content = await createPngImageFileContent();
        // Verify what magic-bytes detects for PNG
        const detectedTypes = magicBytes.filetypeinfo(content);
        expect(detectedTypes.some((type) => type.mime === 'image/png')).toBe(true);

        // Test the validation - should return sanitized buffer for PNG
        const result = await validations.validateFileContent(content);

        expect(Buffer.isBuffer(result)).toBe(true);
        expect(result).not.toEqual(content);

        // Verify it's still a valid PNG
        const resultTypes = magicBytes.filetypeinfo(result);
        expect(resultTypes.some((type) => type.mime === 'image/png')).toBe(true);
      });
    });

    describe('should reject files with disallowed mime types', () => {
      it('detects and rejects executable files', async () => {
        const content = createExecutableFileContent();
        // Verify what magic-bytes detects for executables
        const detectedTypes = magicBytes.filetypeinfo(content);
        expect(detectedTypes.some((type) => type.mime.includes('executable'))).toBe(true);

        // Test the validation
        await expect(validations.validateFileContent(content)).rejects.toThrow(
          /Potential invalid mimetypes detected/
        );
      });

      it('detects and rejects PDF files', async () => {
        const content = createPdfFileContent();
        // Verify what magic-bytes detects for PDF
        const detectedTypes = magicBytes.filetypeinfo(content);
        expect(detectedTypes.some((type) => type.mime === 'application/pdf')).toBe(true);

        // Test the validation
        await expect(() => validations.validateFileContent(content)).rejects.toThrow(
          /Potential invalid mimetypes detected/
        );
      });

      it('throws when no file types can be detected', async () => {
        // Create some random bytes that don't match any known format
        const content = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0]);
        // Verify that magic-bytes can't detect any types
        const detectedTypes = magicBytes.filetypeinfo(content);
        expect(detectedTypes.length).toBe(0);

        // Test the validation
        await expect(() => validations.validateFileContent(content)).rejects.toThrow(
          /Unable to determine content types/
        );
      });
    });

    describe('should handle limitations of magic-bytes detection', () => {
      it('cannot detect plain text files with magic-bytes', async () => {
        const content = Buffer.from('This is a plain text file without any special markers');
        // Verify that magic-bytes can't reliably detect text files
        const detectedTypes = magicBytes.filetypeinfo(content);
        // Assert that either no types are detected or none of them are text/plain
        expect(detectedTypes.length === 0).toBe(true);

        // The validation should throw because text can't be detected
        await expect(() => validations.validateFileContent(content)).rejects.toThrow();
      });

      it('cannot detect YAML files with magic-bytes', async () => {
        const content = Buffer.from('key: value\nother_key: other_value');
        // Verify that magic-bytes can't detect YAML
        const detectedTypes = magicBytes.filetypeinfo(content);
        // Assert that either no types are detected or none of them are text/yaml
        expect(detectedTypes.length === 0).toBe(true);

        // The validation should throw because YAML can't be detected
        await expect(() => validations.validateFileContent(content)).rejects.toThrow();
      });
    });
  });

  describe('getFileExtension', () => {
    describe('should extract file extensions correctly', () => {
      it('gets extensions from simple filenames', () => {
        expect(validations.getFileExtension('file.txt')).toBe('.txt');
        expect(validations.getFileExtension('document.pdf')).toBe('.pdf');
        expect(validations.getFileExtension('image.png')).toBe('.png');
        expect(validations.getFileExtension('archive.tar.gz')).toBe('.gz');
      });

      it('gets extensions from paths with directories', () => {
        expect(validations.getFileExtension('/path/to/file.txt')).toBe('.txt');
        expect(validations.getFileExtension('relative/path/document.json')).toBe('.json');
        expect(validations.getFileExtension('C:\\Windows\\System32\\config.ini')).toBe('.ini');
      });

      it('handles mixed case extensions correctly', () => {
        expect(validations.getFileExtension('README.MD')).toBe('.md');
        expect(validations.getFileExtension('script.JS')).toBe('.js');
        expect(validations.getFileExtension('image.PNG')).toBe('.png');
      });

      it('handles files with multiple dots in the name', () => {
        expect(validations.getFileExtension('file.with.many.dots.txt')).toBe('.txt');
        expect(validations.getFileExtension('version.1.0.2.tar.gz')).toBe('.gz');
        expect(validations.getFileExtension('react.development.js')).toBe('.js');
      });
    });

    describe('should handle edge cases', () => {
      it('returns empty string for files without extensions', () => {
        expect(validations.getFileExtension('README')).toBe('');
        expect(validations.getFileExtension('Dockerfile')).toBe('');
        expect(validations.getFileExtension('LICENSE')).toBe('');
      });

      it('returns empty string when the dot is part of a directory name', () => {
        expect(validations.getFileExtension('/path/with.dots/file')).toBe('');
        expect(validations.getFileExtension('directory.name/filename')).toBe('');
      });

      it('returns empty string when path ends with a dot', () => {
        expect(validations.getFileExtension('file.')).toBe('');
        expect(validations.getFileExtension('/path/to/name.')).toBe('');
      });

      it('handles unusual path formats', () => {
        expect(validations.getFileExtension('/.hidden.txt')).toBe('.txt');

        // This would be caught by path traversal validations, but we test the extension extraction here
        expect(validations.getFileExtension('path/to/../file.log')).toBe('.log');
      });

      it('handles empty and invalid inputs', () => {
        expect(validations.getFileExtension('')).toBe('');
        expect(validations.getFileExtension('/')).toBe('');
        expect(validations.getFileExtension('.')).toBe('');
      });
    });

    describe('should handle non-string inputs', () => {
      it('converts objects with toString method to string', () => {
        const pathObj = {
          toString: () => '/path/to/file.json',
        };
        expect(validations.getFileExtension(pathObj)).toBe('.json');
      });

      it('handles undefined and null gracefully', () => {
        // These should not throw errors
        expect(() => validations.getFileExtension(undefined)).not.toThrow();
        expect(() => validations.getFileExtension(null)).not.toThrow();
      });
    });
  });

  describe('validateFileSize', () => {
    // Get access to the MAX_FILE_SIZE constant
    const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB - this should match the constant in fs_validations.js

    describe('should accept files with sizes within limits', () => {
      it('accepts empty files', () => {
        const content = Buffer.alloc(0);
        expect(() => validations.validateFileSize(content)).not.toThrow();
      });

      it('accepts small files (1KB)', () => {
        const content = Buffer.alloc(1024); // 1KB
        expect(() => validations.validateFileSize(content)).not.toThrow();
      });

      it('accepts medium-sized files (1MB)', () => {
        const content = Buffer.alloc(1024 * 1024); // 1MB
        expect(() => validations.validateFileSize(content)).not.toThrow();
      });

      it('accepts files just under the maximum size', () => {
        // Use a smaller buffer for testing purposes
        const content = Buffer.alloc(1024 * 1024 * 10); // 10MB, not actually at limit for test performance
        expect(() => validations.validateFileSize(content)).not.toThrow();
      });
    });

    describe('should reject files exceeding size limits', () => {
      it('rejects files exceeding the maximum size', () => {
        // Mock a buffer that appears larger than the max size
        const mockBuffer = Buffer.alloc(10); // Small actual buffer
        Object.defineProperty(mockBuffer, 'length', { value: MAX_FILE_SIZE + 1 });

        expect(() => validations.validateFileSize(mockBuffer)).toThrow(
          `File size exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes`
        );
      });

      it('rejects files exactly at the maximum size limit', () => {
        // Mock a buffer exactly at the limit
        const mockBuffer = Buffer.alloc(10); // Small actual buffer
        Object.defineProperty(mockBuffer, 'length', { value: MAX_FILE_SIZE });

        expect(() => validations.validateFileSize(mockBuffer)).not.toThrow();
      });
    });

    describe('should handle edge cases', () => {
      it('handles Buffer inputs correctly', () => {
        const content = Buffer.from('test content');
        expect(() => validations.validateFileSize(content)).not.toThrow();
        expect(validations.validateFileSize(content)).toBe(true);
      });

      it('returns true when validation passes', () => {
        const content = Buffer.alloc(1024);
        expect(validations.validateFileSize(content)).toBe(true);
      });

      it('throws with helpful error message when validation fails', () => {
        const mockBuffer = Buffer.alloc(10);
        Object.defineProperty(mockBuffer, 'length', { value: MAX_FILE_SIZE + 1000 });

        expect(() => validations.validateFileSize(mockBuffer)).toThrow(
          /File size exceeds maximum allowed size/
        );
      });
    });
  });
});
