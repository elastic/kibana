/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { getDefaultEuiMarkdownPlugins } from '@elastic/eui';

import { MarkdownRenderer } from './markdown_renderer';

const { processingPlugins: processingPluginList } = getDefaultEuiMarkdownPlugins();

// Test helpers
const renderMarkdown = (content: string) => {
  return render(<MarkdownRenderer content={content} processingPluginList={processingPluginList} />);
};

const getContainer = () => screen.getByTestId('markdownRenderer');

// Common malicious patterns for testing
const MALICIOUS_PATTERNS = {
  SCRIPT_TAG: '<script>alert("XSS")</script>',
  JAVASCRIPT_PROTOCOL: 'javascript:alert("XSS")', // eslint-disable-line no-script-url
  VBSCRIPT_PROTOCOL: 'vbscript:msgbox("XSS")',
  DATA_URL_SCRIPT: 'data:text/html,<script>alert("XSS")</script>',
  ONERROR_ATTRIBUTE: '<img src="x" onerror="alert(\'XSS\')" />',
  STYLE_JAVASCRIPT: '<div style="background: url(javascript:alert(\'XSS\'))">content</div>',
};

const DANGEROUS_HTML_TAGS = [
  '<iframe src="https://evil.com"></iframe>',
  '<object data="malicious.swf"></object>',
  '<embed src="malicious.swf"></embed>',
  '<form><input type="text" /><button>Submit</button></form>',
];

describe('Markdown Security', () => {
  describe('Script Injection Prevention', () => {
    it('should sanitize script tags in content', () => {
      renderMarkdown(MALICIOUS_PATTERNS.SCRIPT_TAG);

      const container = getContainer();
      expect(container.innerHTML).not.toContain('<script>');
      expect(container.innerHTML).not.toContain('alert');
    });

    it('should sanitize inline event handlers', () => {
      renderMarkdown(MALICIOUS_PATTERNS.ONERROR_ATTRIBUTE);

      const container = getContainer();
      expect(container.innerHTML).not.toContain('onerror');
      expect(container.innerHTML).not.toContain('alert');
    });

    it('should sanitize style attributes with javascript', () => {
      renderMarkdown(MALICIOUS_PATTERNS.STYLE_JAVASCRIPT);

      const container = getContainer();
      expect(container.innerHTML).not.toContain('javascript:'); // eslint-disable-line no-script-url
      expect(container.innerHTML).not.toContain('alert');
    });
  });

  describe('URL Protocol Security', () => {
    it('should handle javascript: protocol in markdown links', () => {
      const maliciousLink = `[Click me](${MALICIOUS_PATTERNS.JAVASCRIPT_PROTOCOL})`;
      renderMarkdown(maliciousLink);

      const container = getContainer();
      expect(container.innerHTML).toBe(
        `<p>[Click me](${MALICIOUS_PATTERNS.JAVASCRIPT_PROTOCOL})</p>`
      );
    });

    it('should handle data: URLs with scripts', () => {
      const maliciousLink = `[Click me](${MALICIOUS_PATTERNS.DATA_URL_SCRIPT})`;
      renderMarkdown(maliciousLink);

      const container = getContainer();
      expect(container.innerHTML).toBe(
        '<p>[Click me](data:text/html,&lt;script&gt;alert("XSS")&lt;/script&gt;)</p>'
      );
    });

    const dangerousProtocols = [
      MALICIOUS_PATTERNS.JAVASCRIPT_PROTOCOL,
      MALICIOUS_PATTERNS.VBSCRIPT_PROTOCOL,
      'ftp://malicious.com/file',
    ];

    dangerousProtocols.forEach((protocol) => {
      it(`should neutralize ${protocol.split(':')[0]}: protocol`, () => {
        const maliciousLink = `[Click me](${protocol})`;
        renderMarkdown(maliciousLink);

        const container = getContainer();
        expect(container.innerHTML).toBe(`<p>[Click me](${protocol})</p>`);
        cleanup();
      });
    });
  });

  describe('HTML Tag Sanitization', () => {
    it('should strip HTML tags and keep text content', () => {
      const htmlContent = '<strong>Bold text</strong> and <em>italic text</em>';
      renderMarkdown(htmlContent);

      const container = getContainer();
      expect(container.innerHTML).toBe('<p>Bold text and italic text</p>');
    });

    DANGEROUS_HTML_TAGS.forEach((dangerousTag) => {
      it(`should sanitize ${dangerousTag.match(/<(\w+)/)?.[1]} tags`, () => {
        renderMarkdown(dangerousTag);

        const container = getContainer();
        const tagName = dangerousTag.match(/<(\w+)/)?.[1];
        expect(container.innerHTML).not.toContain(`<${tagName}`);
      });
    });

    it('should remove potentially dangerous attributes', () => {
      const contentWithAttributes =
        '<div onclick="alert(1)" onload="alert(2)" style="expression(alert(3))">content</div>';
      renderMarkdown(contentWithAttributes);

      const container = getContainer();
      expect(container.innerHTML).not.toContain('onclick');
      expect(container.innerHTML).not.toContain('onload');
      expect(container.innerHTML).not.toContain('expression');
    });
  });

  describe('Safe Link Handling', () => {
    const safeLinkTests = [
      { name: 'HTTP links', url: 'http://example.com', expected: 'http://example.com' },
      { name: 'HTTPS links', url: 'https://example.com', expected: 'https://example.com' },
      { name: 'relative links', url: '/path/to/page', expected: '/path/to/page' },
      { name: 'mailto links', url: 'mailto:test@example.com', expected: 'mailto:test@example.com' },
    ];

    safeLinkTests.forEach(({ name, url, expected }) => {
      it(`should allow ${name}`, () => {
        const safeLink = `[Link text](${url})`;
        renderMarkdown(safeLink);

        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', expected);
        expect(link.textContent).toBe('Link text');
      });
    });
  });

  describe('Image Security', () => {
    it('should render safe images with proper attributes', () => {
      const safeImage = '![Alt text](https://example.com/image.jpg "Image title")';
      renderMarkdown(safeImage);

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
      expect(image).toHaveAttribute('alt', 'Alt text');
      expect(image).toHaveAttribute('title', 'Image title');
    });

    it('should handle javascript: protocol in image src', () => {
      const dangerousImage = `![Alt](${MALICIOUS_PATTERNS.JAVASCRIPT_PROTOCOL})`;
      renderMarkdown(dangerousImage);

      const container = getContainer();
      // The javascript: protocol gets URL encoded but is still present
      expect(container.innerHTML).toContain('javascript:alert(%22XSS%22)'); // eslint-disable-line no-script-url
      // Verify it doesn't execute by checking no actual script tags exist
      expect(container.querySelectorAll('script')).toHaveLength(0);
    });
  });

  describe('Code Block Safety', () => {
    it('should render code blocks as static text', () => {
      const codeBlock =
        '```javascript\nalert("This should not execute");\nconsole.log("Code block");\n```';
      renderMarkdown(codeBlock);

      const container = getContainer();
      expect(container.textContent).toContain('alert("This should not execute");');
      expect(container.querySelectorAll('script')).toHaveLength(0);

      // Verify code is wrapped in appropriate elements
      const codeElement = container.querySelector('code');
      expect(codeElement).toBeInTheDocument();
    });

    it('should render inline code safely', () => {
      const inlineCode = 'Here is some `alert("XSS")` inline code.';
      renderMarkdown(inlineCode);

      const container = getContainer();
      const codeElement = container.querySelector('code');
      expect(codeElement).toBeInTheDocument();
      expect(codeElement?.textContent).toBe('alert("XSS")');
      expect(container.querySelectorAll('script')).toHaveLength(0);
    });

    it('should handle code with HTML-like syntax', () => {
      const htmlInCode = 'Code: `<script>alert(1)</script>` and `<img onerror="alert(2)">`';
      renderMarkdown(htmlInCode);

      const container = getContainer();
      expect(container.textContent).toContain('<script>alert(1)</script>');
      expect(container.textContent).toContain('<img onerror="alert(2)">');
      expect(container.querySelectorAll('script')).toHaveLength(0);
    });
  });

  describe('Edge Cases and Content Validation', () => {
    const edgeCases = [
      { name: 'empty content', content: '', expected: '' },
      { name: 'whitespace only', content: '   \n\t  ', expected: '' },
      { name: 'null string', content: 'null', expected: 'null' },
      { name: 'undefined string', content: 'undefined', expected: 'undefined' },
    ];

    edgeCases.forEach(({ name, content, expected }) => {
      it(`should handle ${name} safely`, () => {
        renderMarkdown(content);

        const container = getContainer();
        expect(container).toBeInTheDocument();
        expect(container.textContent?.trim()).toBe(expected);
      });
    });

    it('should handle large content without security vulnerabilities', () => {
      const largeContent = 'A'.repeat(10000) + MALICIOUS_PATTERNS.SCRIPT_TAG;
      renderMarkdown(largeContent);

      const container = getContainer();
      expect(container.innerHTML).not.toContain('<script>');
      expect(container.textContent).toContain('A'.repeat(10000));
    });

    it('should handle mixed safe and malicious content', () => {
      const mixedContent = `
# Safe Heading

Some **bold** text.

${MALICIOUS_PATTERNS.SCRIPT_TAG}

[Normal link](https://example.com)

[Bad link](${MALICIOUS_PATTERNS.JAVASCRIPT_PROTOCOL})
      `;
      renderMarkdown(mixedContent);

      const container = getContainer();

      // Safe content should be rendered properly
      expect(container.querySelector('h1')).toBeInTheDocument();
      expect(container.querySelector('strong')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Normal link' })).toHaveAttribute(
        'href',
        'https://example.com'
      );

      // Malicious content should be neutralized
      expect(container.innerHTML).not.toContain('<script>');
      expect(container.innerHTML).toContain('[Bad link](javascript:alert("XSS"))');
    });
  });

  describe('Accessibility Preservation', () => {
    it('should maintain proper accessibility attributes', () => {
      const accessibleContent = `
![Chart showing Q1 results](https://example.com/chart.png "Quarterly sales data visualization")

[Download report](https://example.com/report.pdf "PDF report, 2MB")
      `;
      renderMarkdown(accessibleContent);

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('alt', 'Chart showing Q1 results');
      expect(image).toHaveAttribute('title', 'Quarterly sales data visualization');

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('title', 'PDF report, 2MB');
    });
  });
});
