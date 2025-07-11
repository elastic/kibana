/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-restricted-syntax */

const { join } = require('path');
const { REPO_ROOT } = require('@kbn/repo-info');
const { tmpdir, homedir } = require('os');
const { realpathSync } = require('fs');

const allowedExtensions = ['.txt', '.md', '.log', '.json', '.yml', '.yaml', '.csv', '.svg', '.png'];
const allowedMimeTypes = [
  'text/plain',
  'text/markdown',
  'application/json',
  'text/yaml',
  'text/csv',
  'image/svg+xml',
  'image/png',
];

// Arbitrary maximum file size in bytes: 1GB
const MAX_FILE_SIZE = 1024 * 1024 * 1024;

let magicBytes = require('magic-bytes.js');

const isDevOrCI = process.env.NODE_ENV !== 'production' || process.env.CI === 'true';
const baseSafePaths = [join(REPO_ROOT, 'data'), join(REPO_ROOT, '.es')];

const tmpPath = tmpdir();

const getRealTmpPath = () => {
  let realTmpPath;
  try {
    realTmpPath = realpathSync(tmpPath);
  } catch (e) {
    realTmpPath = tmpPath;
  }

  return realTmpPath;
};

const realTmpPath = getRealTmpPath();

const devOrCIPaths = [
  tmpdir(),
  realTmpPath,
  join(homedir(), '.kibanaSecuritySolutionCliTools'),
  'target',
  '/target',
  '/opt/buildkite-agent',
  '/output',
  'cache-test',
  join(REPO_ROOT, 'target'),
  join(REPO_ROOT, 'x-pack'),
  join(REPO_ROOT, 'scripts'),
];

const safePaths = [...baseSafePaths, ...(isDevOrCI ? devOrCIPaths : [])];

function validateNoPathTraversal(path) {
  // Force string conversion to handle objects with toString methods
  path = String(path);

  // Check for null bytes which can be used to trick path validation
  if (path.includes('\0') || path.includes('%00')) {
    throw new Error('Null bytes not allowed in paths');
  }

  // Detect URL encoding tricks like %2e%2e%2f = ../
  if (/%2e|%2f/i.test(path)) {
    throw new Error('URL encoded path sequences not allowed');
  }

  // Check for suspicious path traversal patterns even before normalization
  if (/\.{2,}[/\\]/.test(path) || path.includes('..')) {
    throw new Error('Path traversal sequences not allowed');
  }
}

function validateFileExtension(path) {
  // Skip validation if path contains __fixtures__
  if (isDevOrCI || path.includes('__fixtures__')) {
    return;
  }

  // Check if the file has an allowed extension
  const hasAllowedExtension = allowedExtensions.some((ext) => path.toLowerCase().endsWith(ext));

  if (!hasAllowedExtension) {
    throw new Error(
      `Invalid file type: "${path}". Only .txt, .md, and .log files are allowed outside of __fixtures__ directories.`
    );
  }
}

function validatePathIsSubdirectoryOfSafeDirectory(path) {
  // if (!isDevOrCI && !safePaths.some((safePath) => path.startsWith(safePath))) {
  //   throw new Error(`Unsafe path detected: "${path}".`);
  // }
}

/**
 * Validates that the file content bytes have an allowed mimetype and extension
 * @param {Buffer|Uint8Array} fileBytes - The bytes of the file to validate
 * @returns {boolean} - Returns true if validation passes
 * @throws {Error} - Throws if validation fails
 */
function validateFileContent(fileBytes) {
  // Use magic-bytes to detect mimetype
  const possibleTypes = magicBytes.filetypeinfo(fileBytes);

  if (!possibleTypes || possibleTypes.length === 0) {
    throw new Error(`Unable to determine content types for file`);
  }

  const possibleMimeTypes = possibleTypes.map((type) => type.mime);
  const hasAllowedMimeType = possibleMimeTypes.some((mime) => allowedMimeTypes.includes(mime));
  if (!hasAllowedMimeType) {
    throw new Error(
      `Potential invalid mimetypes detected: "${possibleMimeTypes.join(
        ', '
      )}". Allowed mimetypes: ${allowedMimeTypes.join(', ')}`
    );
  }

  const possibleExtensions = possibleTypes.map((type) => type.extension);
  const hasAllowedExtension = possibleExtensions.some((extension) =>
    allowedExtensions.includes(extension)
  );
  if (!hasAllowedExtension) {
    throw new Error(
      `Potential invalid extensions detected: "${possibleExtensions.join(
        ', '
      )}". Allowed extensions: ${allowedExtensions.join(', ')}`
    );
  }

  return true;
}

/**
 * Validates that the file size is below the maximum allowed size
 * @param {number} fileSize - Size of the file in bytes
 * @returns {boolean} - Returns true if validation passes
 * @throws {Error} - Throws if validation fails
 */
function validateFileSize(fileSize) {
  if (typeof fileSize !== 'number' || fileSize <= 0) {
    throw new Error(`Invalid file size: ${fileSize}`);
  }

  if (fileSize > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes`);
  }

  return true;
}

/**
 * Validates that a filename contains only allowed characters
 * @param {string} filename - The filename to validate (without path)
 * @returns {boolean} - Returns true if validation passes
 * @throws {Error} - Throws if validation fails
 */
function validateFilename(filename) {
  // Only allow alphanumeric characters, underscores, hyphens, and dots
  const validFilenameRegex = /^[a-zA-Z0-9_\-\.]+$/;

  if (!validFilenameRegex.test(filename)) {
    throw new Error(
      `Invalid filename: "${filename}". Filenames can only contain alphanumeric characters, underscores, hyphens, and dots.`
    );
  }

  return true;
}

/**
 * Validates that file content is valid UTF-8 encoded text
 * @param {Buffer} content - The file content to validate
 * @returns {boolean} - Returns true if validation passes
 * @throws {Error} - Throws if validation fails
 */
function validateContentEncoding(content) {
  try {
    // Attempt to decode as UTF-8
    const decoded = content.toString('utf8');

    // Check for the replacement character � which indicates invalid UTF-8
    if (decoded.includes('�')) {
      throw new Error('Content contains invalid UTF-8 sequences');
    }

    return true;
  } catch (error) {
    throw new Error(`Invalid content encoding: ${error.message}`);
  }
}

/**
 * Validates that file permissions are secure (not world-writable)
 * @param {string} filePath - Path to the file
 * @returns {boolean} - Returns true if validation passes
 * @throws {Error} - Throws if validation fails
 */
function validateFilePermissions(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const mode = stats.mode;

    // Check if file is world-writable (permissions & 0o002)
    if (mode & 0o002) {
      throw new Error(`Insecure file permissions: "${filePath}" is world-writable`);
    }

    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`File not found: "${filePath}"`);
    }
    throw error;
  }
}

/**
 * Validates content length against expected size range for the content type
 * @param {Buffer} content - The file content
 * @param {string} mimeType - The detected MIME type
 * @returns {boolean} - Returns true if validation passes
 * @throws {Error} - Throws if validation fails
 */
function validateContentLength(content, mimeType) {
  // Define reasonable size ranges for different content types
  const sizeRanges = {
    'application/json': { min: 2, max: 10 * 1024 * 1024 }, // 2B to 10MB
    'text/yaml': { min: 1, max: 5 * 1024 * 1024 }, // 1B to 5MB
    'text/plain': { min: 0, max: 20 * 1024 * 1024 }, // 0B to 20MB
    'text/markdown': { min: 1, max: 15 * 1024 * 1024 }, // 1B to 15MB
    'text/csv': { min: 1, max: 100 * 1024 * 1024 }, // 1B to 100MB
  };

  const range = sizeRanges[mimeType];
  if (range) {
    const contentSize = content.length;
    if (contentSize < range.min || contentSize > range.max) {
      throw new Error(
        `Content size (${contentSize} bytes) outside expected range for ${mimeType}: ${range.min}-${range.max} bytes`
      );
    }
  }

  return true;
}

/**
 * Validates that a path is not a symbolic link
 * @param {string} filePath - Path to check
 * @returns {boolean} - Returns true if validation passes
 * @throws {Error} - Throws if validation fails
 */
function validateNoSymlinks(filePath) {
  try {
    const fs = require('fs');
    const stats = fs.lstatSync(filePath);
    if (stats.isSymbolicLink()) {
      throw new Error(`Symbolic links are not allowed: "${filePath}"`);
    }
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, so it's not a symlink
      return true;
    }
    throw error;
  }
}

module.exports = {
  validateFileExtension,
  validateNoPathTraversal,
  validatePathIsSubdirectoryOfSafeDirectory,
  validateFileContent,
  validateFileSize,
  validateFilename,
  validateContentEncoding,
  validateFilePermissions,
  validateContentLength,
  validateNoSymlinks,
};
