/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-restricted-syntax */

function isBase64Encoded(str) {
  if (typeof str !== 'string' || str.length === 0) {
    return false;
  }

  try {
    // Check if the string can be converted to a Buffer with 'base64' encoding
    // and then back to base64, comparing it with the original.
    // This ensures it's a valid Base64 string and not just random characters.
    return Buffer.from(str, 'base64').toString('base64') === str;
  } catch (e) {
    return false;
  }
}

/**
 * Sanitizes SVG content by removing potentially dangerous elements and attributes
 * @param {Buffer} svgContent - The SVG content to purify as a Buffer
 * @returns {Buffer} - The purified SVG content as a Buffer
 * @throws {Error} - Throws if purification fails
 */
function sanitizeSvg(svgContent) {
  try {
    // Convert buffer to string
    const svgString = svgContent.toString('utf8');

    // Check if the content is base64 encoded
    let contentToSanitize = svgString;
    if (isBase64Encoded(svgString)) {
      try {
        const decoded = Buffer.from(svgString, 'base64').toString('utf8');
        // Simple verification that it looks like SVG content
        if (decoded.includes('<svg') || decoded.includes('<?xml')) {
          contentToSanitize = decoded;
        }
      } catch (decodeError) {
        // If decoding fails, use the original content
        console.error('Failed to decode base64 content:', decodeError);
      }
    }

    // Try to load the required modules
    const createDOMPurify = require('dompurify');
    const { JSDOM } = require('jsdom');

    // Create a DOM environment
    const window = new JSDOM('').window;
    const DOMPurify = createDOMPurify(window);

    // Configure DOMPurify for SVG
    DOMPurify.setConfig({
      USE_PROFILES: { svg: true, svgFilters: true },
      ADD_TAGS: ['svg', 'path', 'circle', 'rect', 'line', 'g', 'defs'],
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'foreignObject'],
      FORBID_ATTR: [
        'onerror',
        'onload',
        'onclick',
        'onmouseover',
        'eval',
        'javascript',
        'formaction',
        'xlink:href',
        'href',
        'src',
        'data',
      ],
    });

    // Sanitize and convert the result back to a Buffer
    const sanitizedString = DOMPurify.sanitize(contentToSanitize);
    return Buffer.from(sanitizedString, 'utf8');
  } catch (error) {
    throw new Error(`SVG purification failed: ${error.message}`);
  }
}

/**
 * Sanitizes PNG images by stripping metadata and keeping only essential chunks
 * @param {Buffer} pngContent - The PNG image content to sanitize
 * @returns {Buffer} - The sanitized PNG content
 * @throws {Error} - Throws if sanitization fails
 */
async function sanitizePng(pngContent) {
  const sharp = require('sharp');

  // Validate input is a Buffer
  if (!Buffer.isBuffer(pngContent)) {
    throw new Error('PNG content must be a Buffer');
  }

  // Use sharp to process the PNG, removing metadata
  return await sharp(pngContent)
    .png({ compressionLevel: 9, adaptiveFiltering: true }) // High compression, adaptive filtering
    .toBuffer();
}

module.exports = {
  sanitizeSvg,
  sanitizePng,
  isBase64Encoded,
};
