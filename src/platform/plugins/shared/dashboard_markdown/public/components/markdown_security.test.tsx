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
import { MarkdownRenderer } from './markdown_renderer';
import { getDefaultEuiMarkdownPlugins } from '@elastic/eui';

const { processingPlugins: processingPluginList } = getDefaultEuiMarkdownPlugins();

describe('Markdown Security', () => {
  describe('XSS Prevention', () => {
    it('should sanitize script tags', () => {
      const maliciousContent = '<script>alert("XSS")</script>';
      render(
        <MarkdownRenderer content={maliciousContent} processingPluginList={processingPluginList} />
      );

      const container = screen.getByTestId('markdownRenderer');
      expect(container.innerHTML).not.toContain('<script>');
    });

    it('should sanitize javascript: protocol in links', () => {
      const maliciousContent = '[Click me](javascript:alert("XSS"))';
      render(
        <MarkdownRenderer content={maliciousContent} processingPluginList={processingPluginList} />
      );

      const container = screen.getByTestId('markdownRenderer');
      expect(container.innerHTML).toBe('<p>[Click me](javascript:alert("XSS"))</p>');
    });

    it('should sanitize data: URLs with JavaScript become just text', () => {
      const maliciousContent = '[Click me](data:text/html,<script>alert("XSS")</script>)';
      render(
        <MarkdownRenderer content={maliciousContent} processingPluginList={processingPluginList} />
      );

      const container = screen.getByTestId('markdownRenderer');
      expect(container.innerHTML).toBe(
        '<p>[Click me](data:text/html,&lt;script&gt;alert("XSS")&lt;/script&gt;)</p>'
      );
    });
  });

  describe('HTML Sanitization', () => {
    it('do not allow HTML tags', () => {
      const safeContent = '<strong>Bold text</strong> and <em>italic text</em>';
      render(
        <MarkdownRenderer content={safeContent} processingPluginList={processingPluginList} />
      );

      const container = screen.getByTestId('markdownRenderer');
      expect(container.innerHTML).toBe('<p>Bold text and italic text</p>');
    });

    it('should sanitize dangerous HTML tags', () => {
      const dangerousContent =
        '<iframe src="https://evil.com"></iframe><object data="malicious.swf"></object>';
      render(
        <MarkdownRenderer content={dangerousContent} processingPluginList={processingPluginList} />
      );

      const container = screen.getByTestId('markdownRenderer');
      expect(container.innerHTML).not.toContain('<iframe');
      expect(container.innerHTML).not.toContain('<object');
      expect(container.innerHTML).not.toContain('evil.com');
    });

    it('should sanitize form elements', () => {
      const formContent = '<form><input type="text" /><button>Submit</button></form>';
      render(
        <MarkdownRenderer content={formContent} processingPluginList={processingPluginList} />
      );

      const container = screen.getByTestId('markdownRenderer');
      expect(container.innerHTML).not.toContain('<form');
      expect(container.innerHTML).not.toContain('<input');
      expect(container.innerHTML).not.toContain('<button');
    });

    it('should sanitize style attributes with dangerous content', () => {
      const styleContent =
        '<div style="background: url(javascript:alert(\'XSS\'))">Styled content</div>';
      render(
        <MarkdownRenderer content={styleContent} processingPluginList={processingPluginList} />
      );

      const container = screen.getByTestId('markdownRenderer');
      expect(container.innerHTML).not.toContain('javascript:');
      expect(container.innerHTML).not.toContain('alert');
    });
  });

  describe('Link Security', () => {
    it('should allow safe HTTP links', () => {
      const safeLink = '[Safe link](https://example.com)';
      render(<MarkdownRenderer content={safeLink} processingPluginList={processingPluginList} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'https://example.com');
    });

    it('should allow safe HTTPS links', () => {
      const safeLink = '[Secure link](https://secure.example.com)';
      render(<MarkdownRenderer content={safeLink} processingPluginList={processingPluginList} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'https://secure.example.com');
    });

    it('should sanitize or remove dangerous protocols', () => {
      const dangerousProtocols = [
        'javascript:alert("XSS")',
        'vbscript:msgbox("XSS")',
        'ftp://malicious.com/file',
      ];

      dangerousProtocols.forEach((protocol) => {
        const maliciousLink = `[Click me](${protocol})`;
        render(
          <MarkdownRenderer content={maliciousLink} processingPluginList={processingPluginList} />
        );

        const container = screen.getByTestId('markdownRenderer');
        expect(container.innerHTML).toBe(`<p>[Click me](${protocol})</p>`);
        cleanup();
      });
    });
  });

  describe('Image Security', () => {
    it('should allow safe image sources', () => {
      const safeImage = '![Alt text](https://example.com/image.jpg)';
      render(<MarkdownRenderer content={safeImage} processingPluginList={processingPluginList} />);

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
      expect(image).toHaveAttribute('alt', 'Alt text');
    });

    it('should apply CSS security for images', () => {
      const imageContent = '![Test image](https://example.com/test.jpg)';
      render(
        <MarkdownRenderer content={imageContent} processingPluginList={processingPluginList} />
      );

      const container = screen.getByTestId('markdownRenderer');
      const image = container.querySelector('img');
      expect(image).toBeInTheDocument();
      if (image) {
        const computedStyle = window.getComputedStyle(image);
        expect(computedStyle.maxInlineSize).toBe('100%');
      }
    });
  });

  describe('Code Injection Prevention', () => {
    it('should safely render code blocks without execution', () => {
      const codeBlock =
        '```javascript\nalert("This should not execute");\nconsole.log("Code block");\n```';
      render(<MarkdownRenderer content={codeBlock} processingPluginList={processingPluginList} />);

      const container = screen.getByTestId('markdownRenderer');
      expect(container.textContent).toContain('alert("This should not execute");');

      const scripts = container.querySelectorAll('script');
      expect(scripts).toHaveLength(0);
    });

    it('should safely render inline code without execution', () => {
      const inlineCode = 'Here is some `alert("XSS")` inline code.';
      render(<MarkdownRenderer content={inlineCode} processingPluginList={processingPluginList} />);

      const container = screen.getByTestId('markdownRenderer');
      const codeElement = container.querySelector('code');
      expect(codeElement).toBeInTheDocument();
      expect(codeElement?.textContent).toBe('alert("XSS")');
    });
  });

  describe('Content Validation', () => {
    it('should handle empty content safely', () => {
      render(<MarkdownRenderer content="" processingPluginList={processingPluginList} />);

      const container = screen.getByTestId('markdownRenderer');
      expect(container).toBeInTheDocument();
      expect(container.textContent).toBe('');
    });

    it('should handle null-like content safely', () => {
      render(<MarkdownRenderer content="null" processingPluginList={processingPluginList} />);

      const container = screen.getByTestId('markdownRenderer');
      expect(container).toBeInTheDocument();
      expect(container.textContent).toBe('null');
    });

    it('should handle very large content without security issues', () => {
      const largeContent = 'A'.repeat(10000) + '<script>alert("XSS")</script>';
      render(
        <MarkdownRenderer content={largeContent} processingPluginList={processingPluginList} />
      );

      const container = screen.getByTestId('markdownRenderer');
      expect(container.innerHTML).not.toContain('<script>');
      expect(container.textContent).toContain('A'.repeat(10000));
    });
  });

  describe('Accessibility and Security', () => {
    it('should maintain accessibility while preventing security issues', () => {
      const accessibleContent = '![Important text](https://placehold.co/1000x200 "a title")';
      render(
        <MarkdownRenderer content={accessibleContent} processingPluginList={processingPluginList} />
      );
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('alt', 'Important text');
      expect(image).toHaveAttribute('title', 'a title');
      expect(image).toHaveAttribute('src', 'https://placehold.co/1000x200');
    });
  });
});
