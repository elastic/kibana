/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-restricted-syntax */

const { isBase64Encoded, sanitizeSvg, sanitizePng } = require('./fs_sanitizations');
const sharp = require('sharp');

describe('isBase64Encoded', () => {
  it('should return true for valid base64 encoded strings', () => {
    // Simple text encoded in base64
    expect(isBase64Encoded('SGVsbG8gV29ybGQ=')).toBe(true); // "Hello World"

    // JSON object encoded in base64
    expect(isBase64Encoded('eyJuYW1lIjoiSm9obiIsImFnZSI6MzB9')).toBe(true); // {"name":"John","age":30}

    // Binary data encoded in base64
    const binaryData = Buffer.from([0x00, 0xff, 0x10, 0x88]).toString('base64');
    expect(isBase64Encoded(binaryData)).toBe(true);
  });

  it('should return false for non-base64 encoded strings', () => {
    // Empty string
    expect(isBase64Encoded('')).toBe(false);

    // Plain text
    expect(isBase64Encoded('Hello World')).toBe(false);

    // Invalid base64 characters
    expect(isBase64Encoded('SGVsbG8gV29ybGQ=!')).toBe(false);

    // Missing padding
    expect(isBase64Encoded('SGVsbG8gV29ybGQ')).toBe(false);

    // URL without encoding
    expect(isBase64Encoded('https://example.com')).toBe(false);

    // JSON without encoding
    expect(isBase64Encoded('{"name":"John","age":30}')).toBe(false);
  });

  it('should return false for non-string inputs', () => {
    expect(isBase64Encoded(null)).toBe(false);
    expect(isBase64Encoded(undefined)).toBe(false);
    expect(isBase64Encoded(123)).toBe(false);
    expect(isBase64Encoded({})).toBe(false);
    expect(isBase64Encoded([])).toBe(false);
    expect(isBase64Encoded(Buffer.from('test'))).toBe(false);
  });

  it('should handle edge cases correctly', () => {
    // Base64 that decodes to non-printable characters
    expect(isBase64Encoded('AAAA')).toBe(true); // [0, 0, 0]

    // Base64 with many padding characters
    expect(isBase64Encoded('YQ==')).toBe(true); // "a"

    // Base64 with no padding needed
    expect(isBase64Encoded('YWJj')).toBe(true); // "abc"

    // Very long base64 string
    const longString = 'A'.repeat(1000);
    const longBase64 = Buffer.from(longString).toString('base64');
    expect(isBase64Encoded(longBase64)).toBe(true);
  });

  it('should handle SVG content encoded in base64', () => {
    // Simple SVG encoded in base64
    const svgBase64 = Buffer.from(
      '<svg width="100" height="100"><circle cx="50" cy="50" r="40" /></svg>'
    ).toString('base64');
    expect(isBase64Encoded(svgBase64)).toBe(true);
  });
});

describe('sanitizeSvg', () => {
  it('should process a simple SVG string and return a Buffer', () => {
    const svg = '<svg width="100" height="100"><circle cx="50" cy="50" r="40" /></svg>';
    const result = sanitizeSvg(Buffer.from(svg));

    // Check that result is a Buffer
    expect(Buffer.isBuffer(result)).toBe(true);

    // Convert to string for content verification
    const resultStr = result.toString('utf8');
    expect(resultStr).toContain('<svg');
    expect(resultStr).toContain('<circle');

    // Notice that DOMPurify may change self-closing tags to explicit closing tags
    expect(resultStr).toEqual(
      '<svg width="100" height="100"><circle cx="50" cy="50" r="40"></circle></svg>'
    );
  });

  it('should properly decode and sanitize base64 encoded SVG', () => {
    // Base64 encoded: <svg width="100" height="100"><circle cx="50" cy="50" r="40" /></svg>
    const base64Svg =
      'PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDAiIC8+PC9zdmc+';
    const result = sanitizeSvg(Buffer.from(base64Svg));

    // Check that result is a Buffer
    expect(Buffer.isBuffer(result)).toBe(true);

    // Convert to string for content verification
    const resultStr = result.toString('utf8');
    expect(resultStr).toContain('<svg');
    expect(resultStr).toContain('<circle');
  });

  it('should remove script tags from SVG', () => {
    const maliciousSvg =
      '<svg width="100" height="100"><script>alert("XSS")</script><circle cx="50" cy="50" r="40" /></svg>';
    const result = sanitizeSvg(Buffer.from(maliciousSvg));

    // Convert to string for content verification
    const resultStr = result.toString('utf8');
    expect(resultStr).toContain('<svg');
    expect(resultStr).toContain('<circle');
    expect(resultStr).not.toContain('<script');
    expect(resultStr).not.toContain('alert("XSS")');
  });

  it('should remove onclick attributes from SVG', () => {
    const maliciousSvg =
      '<svg width="100" height="100"><circle cx="50" cy="50" r="40" onclick="alert(\'XSS\')" /></svg>';
    const result = sanitizeSvg(Buffer.from(maliciousSvg));

    // Convert to string for content verification
    const resultStr = result.toString('utf8');
    expect(resultStr).toContain('<svg');
    expect(resultStr).toContain('<circle');
    expect(resultStr).not.toContain('onclick');
    expect(resultStr).not.toContain('alert');
  });

  it('should handle SVG with XML declaration', () => {
    const svg =
      '<?xml version="1.0" standalone="no"?><svg width="100" height="100"><circle cx="50" cy="50" r="40" /></svg>';
    const result = sanitizeSvg(Buffer.from(svg));

    // Convert to string for content verification
    const resultStr = result.toString('utf8');
    expect(resultStr).toContain('<svg');
    expect(resultStr).toContain('<circle');
  });

  it('should handle base64 encoded SVG with XML declaration', () => {
    // Base64 encoded: <?xml version="1.0" standalone="no"?><svg width="100" height="100"><circle cx="50" cy="50" r="40" /></svg>
    const base64Svg =
      'PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/Pjxzdmcgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjQwIiAvPjwvc3ZnPg==';
    const result = sanitizeSvg(Buffer.from(base64Svg));

    // Convert to string for content verification
    const resultStr = result.toString('utf8');
    expect(resultStr).toContain('<svg');
    expect(resultStr).toContain('<circle');
  });

  it('should remove all forbidden tags while preserving safe ones', () => {
    const maliciousSvg = `
      <svg width="100" height="100">
        <script>alert("bad")</script>
        <style>body { background: red; }</style>
        <iframe src="https://evil.com"></iframe>
        <object data="evil.swf"></object>
        <form action="https://evil.com"><input type="text" /></form>
        <foreignObject height="1" width="1"><div>XSS</div></foreignObject>
        <circle cx="50" cy="50" r="40"/>
        <rect x="50" y="50" width="50" height="50"/>
      </svg>
    `;

    // Test that forbidden tags are removed
    const result = sanitizeSvg(Buffer.from(maliciousSvg));
    const resultStr = result.toString('utf8');

    expect(resultStr).toContain('<svg');
    expect(resultStr).toContain('<circle');
    expect(resultStr).toContain('<rect');
    expect(resultStr).not.toContain('<script');
    expect(resultStr).not.toContain('<style');
    expect(resultStr).not.toContain('<iframe');
    expect(resultStr).not.toContain('<object');
    expect(resultStr).not.toContain('<form');
    expect(resultStr).not.toContain('<foreignObject');
  });

  it('should remove all forbidden attributes', () => {
    const maliciousSvg = `
      <svg width="100" height="100">
        <circle
          cx="50"
          cy="50"
          r="40"
          onerror="alert('error')"
          onload="alert('loaded')"
          onclick="alert('clicked')"
          onmouseover="alert('hover')"
          xlink:href="javascript:alert('xlink')"
          href="javascript:alert('href')"
          src="https://evil.com/evil.js"
          data="data:text/javascript,alert('data')"
        />
      </svg>
    `;
    const result = sanitizeSvg(Buffer.from(maliciousSvg));

    // Convert to string for content verification
    const resultStr = result.toString('utf8');
    expect(resultStr).toContain('<svg');
    expect(resultStr).toContain('<circle');
    expect(resultStr).not.toContain('onerror');
    expect(resultStr).not.toContain('onload');
    expect(resultStr).not.toContain('onclick');
    expect(resultStr).not.toContain('onmouseover');
    expect(resultStr).not.toContain('xlink:href');
    expect(resultStr).not.toContain('href');
    expect(resultStr).not.toContain('src');
    expect(resultStr).not.toContain('data');
  });

  it('should handle non-base64 strings that look like base64', () => {
    // This looks like base64 but doesn't decode to valid SVG
    const fakeSvg = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=';
    expect(() => sanitizeSvg(Buffer.from(fakeSvg))).not.toThrow();
    const result = sanitizeSvg(Buffer.from(fakeSvg));

    // Check that result is a Buffer
    expect(Buffer.isBuffer(result)).toBe(true);

    // Convert to string for content verification
    const resultStr = result.toString('utf8');
    expect(resultStr).toBeTruthy();
    expect(resultStr).not.toContain('<svg');
  });

  it('should handle complex nested SVG elements', () => {
    const complexSvg = `
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:rgb(255,0,0);stop-opacity:1" />
            <stop offset="100%" style="stop-color:rgb(0,0,255);stop-opacity:1" />
          </linearGradient>
        </defs>
        <g fill="url(#gradient)">
          <path d="M 0,100 C 0,0 200,0 200,100 C 200,200 0,200 0,100 z" />
        </g>
      </svg>
    `;
    const result = sanitizeSvg(Buffer.from(complexSvg));

    // Convert to string for content verification
    const resultStr = result.toString('utf8');
    expect(resultStr).toContain('<svg');
    expect(resultStr).toContain('<defs>');
    expect(resultStr).toContain('<linearGradient');
    expect(resultStr).toContain('<stop');
    expect(resultStr).toContain('<g');
    expect(resultStr).toContain('<path');
  });
});

describe('sanitizePng', () => {
  it('should return a Buffer when given valid PNG content', async () => {
    // Create a simple PNG buffer for testing

    const testPngBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 0.5 },
      },
    })
      .png()
      .toBuffer();

    const sanitizedPng = await sanitizePng(testPngBuffer);

    // Check that the result is a Buffer
    expect(Buffer.isBuffer(sanitizedPng)).toBe(true);

    // Check that the result is a valid PNG by reading its metadata with Sharp
    const metadata = await sharp(sanitizedPng).metadata();
    expect(metadata.format).toBe('png');
    expect(metadata.width).toBe(100);
    expect(metadata.height).toBe(100);
  });

  it('should throw an error when given non-Buffer input', async () => {
    await expect(async () => {
      await sanitizePng('not a buffer');
    }).rejects.toThrow('PNG content must be a Buffer');
  });

  it('should sanitize PNG by removing metadata', async () => {
    // Create a PNG with metadata
    const testPngWithMetadata = await sharp({
      create: {
        width: 50,
        height: 50,
        channels: 4,
        background: { r: 0, g: 0, b: 255, alpha: 1 },
      },
    })
      .png()
      .withMetadata({
        exif: {
          IFD0: {
            Copyright: 'Test copyright',
            Software: 'Test software',
          },
        },
      })
      .toBuffer();

    const sanitizedPng = await sanitizePng(testPngWithMetadata);

    // Check that metadata was removed
    const metadata = await sharp(sanitizedPng).metadata();

    expect(metadata.exif).toBeUndefined();
  });

  it('should handle empty but valid PNG buffers', async () => {
    // Create a minimal valid PNG
    const minimalPng = await sharp({
      create: {
        width: 1,
        height: 1,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .png()
      .toBuffer();

    const sanitizedPng = await sanitizePng(minimalPng);

    // Should not throw and should return a valid PNG
    const metadata = await sharp(sanitizedPng).metadata();
    expect(metadata.format).toBe('png');
  });
});
