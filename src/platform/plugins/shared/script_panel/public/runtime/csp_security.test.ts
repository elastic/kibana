/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  IFRAME_CSP_DIRECTIVES,
  generateIframeCspHeader,
  validateSandboxSecurity,
  checkParentCspCompatibility,
  SECURITY_CHECKLIST,
} from './csp_security';

describe('CSP Security Model', () => {
  describe('IFRAME_CSP_DIRECTIVES', () => {
    it('should block all resources by default', () => {
      expect(IFRAME_CSP_DIRECTIVES['default-src']).toContain("'none'");
    });

    it('should allow inline scripts for user code execution', () => {
      expect(IFRAME_CSP_DIRECTIVES['script-src']).toContain("'unsafe-inline'");
      expect(IFRAME_CSP_DIRECTIVES['script-src']).toContain("'unsafe-eval'");
    });

    it('should allow inline styles for rendering', () => {
      expect(IFRAME_CSP_DIRECTIVES['style-src']).toContain("'unsafe-inline'");
    });

    it('should block all network connections', () => {
      expect(IFRAME_CSP_DIRECTIVES['connect-src']).toContain("'none'");
    });

    it('should allow data URIs and blob URLs for images only', () => {
      expect(IFRAME_CSP_DIRECTIVES['img-src']).toContain('data:');
      expect(IFRAME_CSP_DIRECTIVES['img-src']).toContain('blob:');
    });
  });

  describe('generateIframeCspHeader', () => {
    it('should generate a valid CSP header string', () => {
      const header = generateIframeCspHeader();

      expect(header).toContain("default-src 'none'");
      expect(header).toContain("script-src 'unsafe-inline' 'unsafe-eval'");
      expect(header).toContain("style-src 'unsafe-inline'");
      expect(header).toContain("connect-src 'none'");
      expect(header).toContain('img-src data: blob:');
    });

    it('should separate directives with semicolons', () => {
      const header = generateIframeCspHeader();
      const directives = header.split('; ');

      expect(directives.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('validateSandboxSecurity', () => {
    const createMockIframe = (options: {
      sandbox?: string[];
      src?: string;
      srcdoc?: string;
    }): HTMLIFrameElement => {
      const iframe = document.createElement('iframe');

      // jsdom's DOMTokenList for sandbox may not be fully implemented,
      // so we need to set the sandbox attribute directly as a string
      if (options.sandbox && options.sandbox.length > 0) {
        iframe.setAttribute('sandbox', options.sandbox.join(' '));
      }

      if (options.src) {
        iframe.src = options.src;
      }

      if (options.srcdoc) {
        iframe.srcdoc = options.srcdoc;
      }

      return iframe;
    };

    it('should validate a correctly configured sandbox', () => {
      const iframe = createMockIframe({
        sandbox: ['allow-scripts'],
        srcdoc: '<html></html>',
      });

      const result = validateSandboxSecurity(iframe);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject iframe without sandbox attribute', () => {
      const iframe = createMockIframe({});

      const result = validateSandboxSecurity(iframe);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Iframe must have sandbox attribute');
    });

    it('should reject iframe without allow-scripts', () => {
      const iframe = createMockIframe({
        sandbox: ['allow-forms'],
      });

      const result = validateSandboxSecurity(iframe);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Iframe sandbox must include allow-scripts');
    });

    it('should REJECT iframe with allow-same-origin (CRITICAL)', () => {
      const iframe = createMockIframe({
        sandbox: ['allow-scripts', 'allow-same-origin'],
      });

      const result = validateSandboxSecurity(iframe);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('allow-same-origin'))).toBe(true);
      expect(result.errors.some((e) => e.includes('SECURITY VIOLATION'))).toBe(true);
    });

    it('should reject iframe with external src URL', () => {
      const iframe = createMockIframe({
        sandbox: ['allow-scripts'],
        src: 'https://example.com',
      });

      const result = validateSandboxSecurity(iframe);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Iframe must use srcdoc, not external src URL');
    });

    it('should allow about: URLs', () => {
      const iframe = createMockIframe({
        sandbox: ['allow-scripts'],
        src: 'about:blank',
      });

      const result = validateSandboxSecurity(iframe);

      expect(result.isValid).toBe(true);
    });

    it('should warn about potentially dangerous sandbox flags', () => {
      const iframe = createMockIframe({
        sandbox: ['allow-scripts', 'allow-top-navigation'],
      });

      const result = validateSandboxSecurity(iframe);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes('allow-top-navigation'))).toBe(true);
    });
  });

  describe('checkParentCspCompatibility', () => {
    it('should report compatibility', () => {
      const result = checkParentCspCompatibility();

      expect(result.compatible).toBe(true);
    });

    it('should provide informational notes about CSP model', () => {
      const result = checkParentCspCompatibility();

      expect(result.notes.length).toBeGreaterThan(0);
      expect(result.notes.some((n) => n.includes('no nonces required'))).toBe(true);
    });
  });

  describe('SECURITY_CHECKLIST', () => {
    it('should have critical security items', () => {
      const criticalItems = SECURITY_CHECKLIST.filter((item) => item.critical);

      expect(criticalItems.length).toBeGreaterThan(0);
    });

    it('should include sandbox-no-same-origin as critical', () => {
      const item = SECURITY_CHECKLIST.find((i) => i.id === 'sandbox-no-same-origin');

      expect(item).toBeDefined();
      expect(item?.critical).toBe(true);
    });

    it('should include esql-only-data as critical', () => {
      const item = SECURITY_CHECKLIST.find((i) => i.id === 'esql-only-data');

      expect(item).toBeDefined();
      expect(item?.critical).toBe(true);
    });

    it('should document that no nonce is required', () => {
      const item = SECURITY_CHECKLIST.find((i) => i.id === 'no-nonce-required');

      expect(item).toBeDefined();
      expect(item?.description).toContain('independent CSP');
    });
  });
});

describe('Security Model - No Nonce Required', () => {
  /**
   * This test documents and validates the key finding that no nonce propagation
   * is required for the script panel's iframe execution model.
   *
   * Background:
   * - Kibana's parent CSP uses `script-src 'self'` (not nonces)
   * - Sandboxed iframes with srcDoc have a null origin
   * - The iframe's CSP is defined via meta tag, independent of parent
   * - No nonce header needs to be passed from server to iframe
   */
  it('should not require nonce propagation from parent to iframe', () => {
    // The CSP directives for the iframe don't include nonce
    const hasNonce = Object.values(IFRAME_CSP_DIRECTIVES).some((values) =>
      values.some((v) => v.includes('nonce'))
    );

    expect(hasNonce).toBe(false);
  });

  it('should use unsafe-inline instead of nonces for script execution', () => {
    // This is intentional and safe because:
    // 1. The iframe has a null origin (no access to parent resources)
    // 2. Network requests are blocked by CSP
    // 3. The only input to the iframe is controlled user code
    expect(IFRAME_CSP_DIRECTIVES['script-src']).toContain("'unsafe-inline'");
  });

  it('should document CSP independence in compatibility check', () => {
    const result = checkParentCspCompatibility();

    expect(result.notes.some((n) => n.includes('independent CSP context'))).toBe(true);
    expect(result.notes.some((n) => n.includes('No CSP header propagation'))).toBe(true);
  });
});
