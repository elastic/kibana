/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-restricted-syntax */

const { join, normalize } = require('path');
const { REPO_ROOT } = require('@kbn/repo-info');
const { tmpdir, homedir } = require('os');
const { realpathSync } = require('fs');
const { sanitizeSvg, sanitizePng } = require('./fs_sanitizations');

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

function isDevOrCIEnvironment() {
  return isDevOrCI;
}

/**
 * Validates that a path does not contain any path traversal sequences or dangerous characters
 * that could be used to access files outside of the intended directory.
 *
 * @param {string|Object} path - The path to validate (will be converted to string)
 * @throws {Error} - Throws if path contains null bytes (e.g., \0 or %00)
 * @throws {Error} - Throws if path contains URL encoded path sequences (e.g., %2e or %2f)
 * @throws {Error} - Throws if path contains directory traversal sequences (e.g., ../ or ..\)
 * @returns {void}
 */
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

/**
 * Gets the file extension from a path
 * @param {string} path - The file path
 * @returns {string} - The file extension including the dot (e.g., '.json'), or empty string if no extension
 */
function getFileExtension(path) {
  // Force string conversion to handle objects with toString methods
  path = String(path);

  // Find the last dot in the filename part of the path (after the last / or \)
  const lastSlashIndex = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  const lastDotIndex = path.lastIndexOf('.');

  // If there's no dot, or the dot is before the last slash (part of a directory name),
  // or the dot is the last character, then there's no extension
  if (lastDotIndex === -1 || lastDotIndex < lastSlashIndex || lastDotIndex === path.length - 1) {
    return '';
  }

  // Return the extension including the dot
  return path.slice(lastDotIndex).toLowerCase();
}

function validateFileExtension(path) {
  const hasAllowedExtension = allowedExtensions.some((ext) => path.toLowerCase().endsWith(ext));

  if (!hasAllowedExtension) {
    throw new Error(
      `Invalid file type: "${path}". Only ${allowedExtensions.join(', ')} files are allowed.`
    );
  }
}

function validatePathIsSubdirectoryOfSafeDirectory(path, isDevOrCiEnvironmentOverride) {
  // Skip if Dev or CI environment so Kibana can build correctly
  // If isDevOrCiEnvironmentOverride is defined, use it, otherwise call isDevOrCIEnvironment()
  if (
    isDevOrCiEnvironmentOverride === true ||
    (isDevOrCiEnvironmentOverride !== false && isDevOrCIEnvironment())
  ) {
    return true;
  }

  // Check if the path is actually a subdirectory of any safe path
  const isSafePath = safePaths.some((safePath) => {
    // Path exactly matches a safe path
    if (path === safePath) {
      return true;
    }

    // Path is a subdirectory of a safe path - must start with safe path followed by a separator
    if (path.startsWith(safePath)) {
      const nextChar = path.charAt(safePath.length);
      // Check if the next character after the safe path is a path separator (/ or \)
      return nextChar === '/' || nextChar === '\\';
    }

    return false;
  });

  if (!isSafePath) {
    throw new Error(`Unsafe path detected: "${path}".`);
  }
}

/**
 * Validates that the file content has an allowed MIME type and sanitizes SVG content
 * @param {Buffer} fileBytes - The bytes of the file to validate
 * @param {string} [path] - The file path used to check file extension to see if this validation applies
 * @returns {Buffer} - Returns the original Buffer for most files or a sanitized Buffer for SVGs
 * @throws {Error} - Throws if validation fails (unrecognized content type or disallowed MIME type)
 * @throws {Error} - Throws if SVG sanitization fails
 */
async function validateFileContent(fileBytes, path) {
  const fileExtension = getFileExtension(path);

  const textBasedExtensionsNotHandledByMagicBytes = [
    '.json',
    '.yml',
    '.yaml',
    '.md',
    '.txt',
    '.log',
    '.csv',
  ];

  if (textBasedExtensionsNotHandledByMagicBytes.includes(fileExtension)) {
    return fileBytes;
  }

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

  // Check if the content is an SVG and sanitize it
  if (possibleMimeTypes.includes('image/svg+xml')) {
    try {
      // Return the sanitized content as Buffer
      return sanitizeSvg(fileBytes);
    } catch (error) {
      throw new Error(`Failed to sanitize SVG content: ${error.message}`);
    }
  }

  // Check if the content is a PNG and sanitize it
  if (possibleMimeTypes.includes('image/png')) {
    try {
      // Return the sanitized content as Buffer
      return await sanitizePng(fileBytes);
    } catch (error) {
      throw new Error(`Failed to sanitize PNG content: ${error.message}`);
    }
  }

  return fileBytes;
}

/**
 * Validates that the file size is within acceptable limits
 * @param {Buffer} data - The file data as a Buffer
 * @returns {boolean} - Returns true if validation passes
 * @throws {Error} - Throws if file size is invalid or exceeds the maximum allowed size
 */
function validateFileSize(data) {
  // Since data is guaranteed to be a Buffer, we can directly use its length property
  const fileSize = data.length;

  if (fileSize > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes`);
  }

  return true;
}

/**
 * Validates content length against expected size range for the content type
 * @param {Buffer} content - The file content
 * @param {string} mimeType - The detected MIME type
 * @throws {Error} - Throws if validation fails
 */
function validateContentLength(content, mimeType) {
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
}

/**
 * Validates and normalizes a user-provided path to ensure it's safe to use
 * @param {string} userPath - The user-provided path to validate and normalize
 * @returns {string} - The normalized path if validation passes
 * @throws {Error} - Throws if the path contains traversal sequences, has invalid file extension,
 *                   or is outside of safe directories in production environments
 */
function getSafePath(userPath) {
  validateNoPathTraversal(userPath); // Should I run this on both?
  const normalizedPath = normalize(userPath);
  validateFileExtension(normalizedPath); // Maintain logic, dont run in prod
  validatePathIsSubdirectoryOfSafeDirectory(normalizedPath); // Maintain logic, run only in prod

  return normalizedPath;
}

/**
 * Validates and sanitizes file data, ensuring consistent Buffer processing
 * @param {Buffer|Uint8Array|string|*} data - The data to validate and sanitize
 * @param {string} [path] - The file path, used to determine content type when magic-bytes detection fails
 * @returns {Buffer} - Returns the validated and sanitized content
 * @throws {Error} - Throws if file size exceeds maximum allowed size
 * @throws {Error} - Throws if content type cannot be determined or is not allowed
 * @throws {Error} - Throws if input type is not supported
 * @throws {Error} - Throws if SVG sanitization fails
 */
async function validateAndSanitizeFileData(data, path) {
  // Convert input to Buffer if needed
  let dataBuffer;

  if (Buffer.isBuffer(data)) {
    // Already a Buffer, no conversion needed
    dataBuffer = data;
  } else if (data instanceof Uint8Array) {
    // Convert Uint8Array to Buffer
    dataBuffer = Buffer.from(data);
  } else if (typeof data === 'string') {
    // Convert string to Buffer
    dataBuffer = Buffer.from(data, 'utf8');
  } else if (data && typeof data === 'object' && 'buffer' in data && Buffer.isBuffer(data.buffer)) {
    // Handle objects with buffer property (like some stream outputs)
    dataBuffer = data.buffer;
  } else {
    throw new Error('Unsupported data type: input must be Buffer, Uint8Array, or string');
  }

  validateFileSize(dataBuffer);
  return await validateFileContent(dataBuffer, path);
}

module.exports = {
  validateFileExtension,
  validateNoPathTraversal,
  validatePathIsSubdirectoryOfSafeDirectory,
  validateFileContent,
  validateFileSize,
  getSafePath,
  validateAndSanitizeFileData,
  getFileExtension,
};
