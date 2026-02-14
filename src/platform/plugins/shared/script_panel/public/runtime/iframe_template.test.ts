/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  generateIframeSrcDoc,
  generateLoadingSrcDoc,
  generateErrorSrcDoc,
} from './iframe_template';
import { DEFAULT_SANDBOX_CONFIG } from './types';

describe('Iframe Template Generation', () => {
  describe('generateIframeSrcDoc', () => {
    const defaultConfig = DEFAULT_SANDBOX_CONFIG;

    it('should generate valid HTML document', () => {
      const srcDoc = generateIframeSrcDoc('console.log("test");', defaultConfig);

      expect(srcDoc).toContain('<!DOCTYPE html>');
      expect(srcDoc).toContain('<html>');
      expect(srcDoc).toContain('</html>');
      expect(srcDoc).toContain('<head>');
      expect(srcDoc).toContain('</head>');
      expect(srcDoc).toContain('<body>');
      expect(srcDoc).toContain('</body>');
    });

    it('should include CSP meta tag with security directives', () => {
      const srcDoc = generateIframeSrcDoc('// code', defaultConfig);

      expect(srcDoc).toContain('Content-Security-Policy');
      expect(srcDoc).toContain("default-src 'none'");
      expect(srcDoc).toContain("script-src 'unsafe-inline' 'unsafe-eval'");
      expect(srcDoc).toContain("style-src 'unsafe-inline'");
      expect(srcDoc).toContain("connect-src 'none'");
      expect(srcDoc).toContain('img-src data: blob:');
    });

    it('should block network connections via CSP', () => {
      const srcDoc = generateIframeSrcDoc('fetch("http://evil.com")', defaultConfig);

      // CSP should block connect-src
      expect(srcDoc).toContain("connect-src 'none'");
    });

    it('should include the root element for rendering', () => {
      const srcDoc = generateIframeSrcDoc('// code', defaultConfig);

      expect(srcDoc).toContain('<div id="root"></div>');
    });

    it('should include user code in a script tag', () => {
      const userCode = 'Kibana.render.setContent("<h1>Hello</h1>");';
      const srcDoc = generateIframeSrcDoc(userCode, defaultConfig);

      expect(srcDoc).toContain(userCode);
    });

    it('should escape backslashes in user code', () => {
      const userCode = 'const path = "C:\\\\Users\\\\test";';
      const srcDoc = generateIframeSrcDoc(userCode, defaultConfig);

      // Should escape backslashes to prevent breaking the template
      expect(srcDoc).toContain('\\\\');
    });

    it('should escape backticks in user code', () => {
      const userCode = 'const template = `Hello ${name}`;';
      const srcDoc = generateIframeSrcDoc(userCode, defaultConfig);

      // Should escape backticks
      expect(srcDoc).toContain('\\`');
    });

    it('should escape dollar signs in user code', () => {
      const userCode = 'const price = "$100";';
      const srcDoc = generateIframeSrcDoc(userCode, defaultConfig);

      // Should escape dollar signs
      expect(srcDoc).toContain('\\$');
    });

    describe('Kibana runtime API', () => {
      it('should expose Kibana.esql.query', () => {
        const srcDoc = generateIframeSrcDoc('// code', defaultConfig);

        expect(srcDoc).toContain('esql:');
        expect(srcDoc).toContain('query:');
      });

      it('should expose Kibana.panel methods', () => {
        const srcDoc = generateIframeSrcDoc('// code', defaultConfig);

        expect(srcDoc).toContain('panel:');
        expect(srcDoc).toContain('getSize:');
        expect(srcDoc).toContain('onResize:');
      });

      it('should expose Kibana.render methods', () => {
        const srcDoc = generateIframeSrcDoc('// code', defaultConfig);

        expect(srcDoc).toContain('render:');
        expect(srcDoc).toContain('setContent:');
        expect(srcDoc).toContain('setError:');
      });

      it('should expose Kibana.log methods', () => {
        const srcDoc = generateIframeSrcDoc('// code', defaultConfig);

        expect(srcDoc).toContain('log:');
        expect(srcDoc).toContain("'log.info'");
        expect(srcDoc).toContain("'log.warn'");
        expect(srcDoc).toContain("'log.error'");
      });

      it('should freeze the Kibana object', () => {
        const srcDoc = generateIframeSrcDoc('// code', defaultConfig);

        expect(srcDoc).toContain('Object.freeze');
      });
    });

    describe('runtime configuration', () => {
      it('should use queryTimeout from config', () => {
        const config = { ...defaultConfig, queryTimeout: 15000 };
        const srcDoc = generateIframeSrcDoc('// code', config);

        expect(srcDoc).toContain('15000');
      });

      it('should use maxQueryLength from config', () => {
        const config = { ...defaultConfig, maxQueryLength: 5000 };
        const srcDoc = generateIframeSrcDoc('// code', config);

        expect(srcDoc).toContain('5000');
      });
    });

    describe('error handling', () => {
      it('should wrap user code in try-catch', () => {
        const srcDoc = generateIframeSrcDoc('// code', defaultConfig);

        expect(srcDoc).toContain('try {');
        expect(srcDoc).toContain('catch (e)');
      });

      it('should display script errors in error div', () => {
        const srcDoc = generateIframeSrcDoc('// code', defaultConfig);

        expect(srcDoc).toContain('script-panel-error');
        expect(srcDoc).toContain('Script Error');
      });

      it('should escape HTML in error messages', () => {
        const srcDoc = generateIframeSrcDoc('// code', defaultConfig);

        // Error display should escape < and > to prevent XSS
        expect(srcDoc).toContain('.replace(/</g');
        expect(srcDoc).toContain('.replace(/>/g');
      });
    });

    describe('RPC bridge', () => {
      it('should include postMessage communication', () => {
        const srcDoc = generateIframeSrcDoc('// code', defaultConfig);

        expect(srcDoc).toContain('postMessage');
        expect(srcDoc).toContain('parent.postMessage');
      });

      it('should include message event listener', () => {
        const srcDoc = generateIframeSrcDoc('// code', defaultConfig);

        expect(srcDoc).toContain("addEventListener('message'");
      });

      it('should send ready event on initialization', () => {
        const srcDoc = generateIframeSrcDoc('// code', defaultConfig);

        expect(srcDoc).toContain("event: 'ready'");
      });

      it('should handle request/response message types', () => {
        const srcDoc = generateIframeSrcDoc('// code', defaultConfig);

        expect(srcDoc).toContain("type === 'response'");
        expect(srcDoc).toContain("type === 'event'");
        expect(srcDoc).toContain("type: 'request'");
      });
    });

    describe('styling', () => {
      it('should include base styles', () => {
        const srcDoc = generateIframeSrcDoc('// code', defaultConfig);

        expect(srcDoc).toContain('<style>');
        expect(srcDoc).toContain('</style>');
        expect(srcDoc).toContain('box-sizing: border-box');
        expect(srcDoc).toContain('margin: 0');
        expect(srcDoc).toContain('padding: 0');
      });

      it('should set transparent background', () => {
        const srcDoc = generateIframeSrcDoc('// code', defaultConfig);

        expect(srcDoc).toContain('background: transparent');
      });

      it('should include error styling', () => {
        const srcDoc = generateIframeSrcDoc('// code', defaultConfig);

        expect(srcDoc).toContain('.script-panel-error');
      });
    });
  });

  describe('generateLoadingSrcDoc', () => {
    it('should generate valid HTML document', () => {
      const srcDoc = generateLoadingSrcDoc();

      expect(srcDoc).toContain('<!DOCTYPE html>');
      expect(srcDoc).toContain('<html>');
      expect(srcDoc).toContain('</html>');
    });

    it('should include loading text', () => {
      const srcDoc = generateLoadingSrcDoc();

      expect(srcDoc).toContain('Loading script');
    });

    it('should include spinner animation', () => {
      const srcDoc = generateLoadingSrcDoc();

      expect(srcDoc).toContain('spinner');
      expect(srcDoc).toContain('@keyframes spin');
    });

    it('should be lightweight (no CSP or runtime)', () => {
      const srcDoc = generateLoadingSrcDoc();

      // Loading state doesn't need CSP since there's no user code
      expect(srcDoc).not.toContain('Kibana.esql');
      expect(srcDoc).not.toContain('sendRequest');
    });
  });

  describe('generateErrorSrcDoc', () => {
    it('should generate valid HTML document', () => {
      const srcDoc = generateErrorSrcDoc('Test error');

      expect(srcDoc).toContain('<!DOCTYPE html>');
      expect(srcDoc).toContain('<html>');
      expect(srcDoc).toContain('</html>');
    });

    it('should display the error message', () => {
      const srcDoc = generateErrorSrcDoc('Something went wrong');

      expect(srcDoc).toContain('Something went wrong');
    });

    it('should include error heading', () => {
      const srcDoc = generateErrorSrcDoc('Test');

      expect(srcDoc).toContain('Script Panel Error');
    });

    it('should escape HTML in error messages', () => {
      const srcDoc = generateErrorSrcDoc('<script>alert("xss")</script>');

      // Should escape angle brackets
      expect(srcDoc).not.toContain('<script>alert');
      expect(srcDoc).toContain('&lt;script&gt;');
    });

    it('should escape ampersands in error messages', () => {
      const srcDoc = generateErrorSrcDoc('foo & bar');

      expect(srcDoc).toContain('&amp;');
    });

    it('should escape quotes in error messages', () => {
      const srcDoc = generateErrorSrcDoc('Error: "quoted"');

      expect(srcDoc).toContain('&quot;');
    });

    it('should include error styling', () => {
      const srcDoc = generateErrorSrcDoc('Test');

      expect(srcDoc).toContain('.error');
      expect(srcDoc).toContain('color: #bd271e'); // Error red
    });
  });

  describe('security considerations', () => {
    it('should not include allow-same-origin in any template', () => {
      const mainDoc = generateIframeSrcDoc('// code', DEFAULT_SANDBOX_CONFIG);
      const loadingDoc = generateLoadingSrcDoc();
      const errorDoc = generateErrorSrcDoc('error');

      // Templates themselves don't set sandbox, but they shouldn't suggest it
      expect(mainDoc).not.toContain('allow-same-origin');
      expect(loadingDoc).not.toContain('allow-same-origin');
      expect(errorDoc).not.toContain('allow-same-origin');
    });

    it('should not include any nonce directives', () => {
      const srcDoc = generateIframeSrcDoc('// code', DEFAULT_SANDBOX_CONFIG);

      expect(srcDoc).not.toContain('nonce');
    });

    it('should use strict mode in runtime', () => {
      const srcDoc = generateIframeSrcDoc('// code', DEFAULT_SANDBOX_CONFIG);

      expect(srcDoc).toContain("'use strict'");
    });

    it('should validate query parameter before sending', () => {
      const srcDoc = generateIframeSrcDoc('// code', DEFAULT_SANDBOX_CONFIG);

      expect(srcDoc).toContain("typeof options.query !== 'string'");
    });
  });
});
