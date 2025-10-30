/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { mkdirSync } from 'fs';
import type { ToolResult } from './types';

// Security limits
const MAX_FILENAME_LENGTH = 255;
const MAX_URL_LENGTH = 2048;
const MAX_TEXT_INPUT_LENGTH = 10000;

/**
 * Create a success result
 */
export function success(data?: any, message?: string): ToolResult {
  return {
    success: true,
    data,
    message,
  };
}

/**
 * Create an error result
 */
export function error(errorMessage: string, data?: any): ToolResult {
  return {
    success: false,
    error: errorMessage,
    data,
  };
}

/**
 * Safely execute an async function and return a ToolResult
 */
export async function executeSafely<T>(
  fn: () => Promise<T>,
  errorPrefix: string = 'Operation failed'
): Promise<ToolResult> {
  try {
    const result = await fn();
    return success(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return error(`${errorPrefix}: ${message}`);
  }
}

/**
 * Validate required parameters
 */
export function validateParams(params: Record<string, any>, required: string[]): string | null {
  for (const key of required) {
    if (params[key] === undefined || params[key] === null) {
      return `Missing required parameter: ${key}`;
    }
  }
  return null;
}

/**
 * Validate and sanitize screenshot filename to prevent path traversal
 */
export function formatScreenshotFilename(filename?: string, extension: string = 'png'): string {
  // Create screenshots directory if it doesn't exist
  const screenshotsDir = path.resolve(process.cwd(), 'screenshots');
  try {
    mkdirSync(screenshotsDir, { recursive: true });
  } catch {
    // Directory might already exist, ignore
  }

  if (filename) {
    // Validate filename length
    if (filename.length > MAX_FILENAME_LENGTH) {
      throw new Error(`Filename exceeds maximum length of ${MAX_FILENAME_LENGTH} characters`);
    }

    // Validate filename contains only safe characters (basic check)
    const basename = path.basename(filename);
    if (!/^[a-zA-Z0-9._-]+$/.test(basename)) {
      throw new Error(
        'Filename contains invalid characters. Only alphanumeric, dots, dashes, and underscores are allowed'
      );
    }

    // Resolve to absolute path to detect traversal attempts
    const resolved = path.resolve(screenshotsDir, basename);

    // Ensure the resolved path is within safe directory
    if (!resolved.startsWith(screenshotsDir + path.sep) && resolved !== screenshotsDir) {
      throw new Error('Invalid filename: path traversal detected');
    }

    return resolved;
  }

  // Generate safe default filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeFilename = `scout-screenshot-${timestamp}.${extension}`;
  return path.resolve(screenshotsDir, safeFilename);
}

/**
 * Validate URL to prevent SSRF attacks
 */
export function validateAndSanitizeUrl(url: string, baseUrl: string): string {
  // Validate length
  if (url.length > MAX_URL_LENGTH) {
    throw new Error(`URL exceeds maximum length of ${MAX_URL_LENGTH} characters`);
  }

  try {
    const urlObj = new URL(url, baseUrl);

    // Whitelist only http/https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Invalid protocol: only http and https allowed');
    }

    // For MCP server, restrict to same origin as base URL
    // This prevents SSRF while allowing legitimate Kibana navigation
    const baseUrlObj = new URL(baseUrl);
    if (urlObj.origin !== baseUrlObj.origin) {
      throw new Error('Invalid URL: must be within target Kibana instance');
    }

    return urlObj.toString();
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Invalid')) {
      throw err;
    }
    throw new Error(`Invalid URL: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Validate text input length
 */
export function validateTextInput(text: string, maxLength: number = MAX_TEXT_INPUT_LENGTH): void {
  if (text.length > maxLength) {
    throw new Error(`Text input exceeds maximum length of ${maxLength} characters`);
  }
}

/**
 * Validate config file path to prevent path traversal
 */
export function validateConfigPath(configPath: string): string {
  // Validate length
  if (configPath.length > MAX_FILENAME_LENGTH * 2) {
    throw new Error('Config path exceeds maximum length');
  }

  // Resolve to absolute path
  const resolved = path.resolve(configPath);

  // Require .json or .jsonc extension
  if (!/\.(json|jsonc)$/i.test(configPath)) {
    throw new Error('Config file must have .json or .jsonc extension');
  }

  // Ensure path is within current working directory or explicitly allowed
  const cwd = process.cwd();
  if (!resolved.startsWith(cwd + path.sep) && resolved !== cwd) {
    throw new Error('Config path must be within current working directory');
  }

  return resolved;
}

interface CodeBlock {
  code: string;
  language: string;
}

interface ConsoleMessage {
  type: 'log' | 'info' | 'warn' | 'error';
  message: string;
  timestamp?: number;
}

/**
 * Builder for structured tool responses
 * Generates consistent markdown format optimized for AI consumption
 * Inspired by microsoft/playwright-mcp patterns
 */
export class ResponseBuilder {
  private resultMessage: string = '';
  private executedCode: CodeBlock[] = [];
  private pageUrl?: string;
  private pageTitle?: string;
  private pageSnapshot?: string;
  private consoleMessages: ConsoleMessage[] = [];
  private authUser?: string;
  private authRole?: string;
  private kibanaApp?: string;
  private kibanaRoute?: string;
  private kibanaContext?: Record<string, unknown>;
  private errorMessage?: string;
  private additionalSections: Record<string, string> = {};

  /**
   * Set the main result message
   */
  setResult(message: string): this {
    this.resultMessage = message;
    return this;
  }

  /**
   * Set an error message
   */
  setError(message: string): this {
    this.errorMessage = message;
    return this;
  }

  /**
   * Add executed code to show what was run (for transparency)
   */
  addCode(code: string, language: string = 'typescript'): this {
    this.executedCode.push({ code, language });
    return this;
  }

  /**
   * Set page state information
   */
  setPageState(url: string, title: string, snapshot?: string): this {
    this.pageUrl = url;
    this.pageTitle = title;
    this.pageSnapshot = snapshot;
    return this;
  }

  /**
   * Add console messages from the browser
   */
  addConsoleMessage(type: ConsoleMessage['type'], message: string): this {
    this.consoleMessages.push({ type, message, timestamp: Date.now() });
    return this;
  }

  /**
   * Add multiple console messages
   */
  addConsoleMessages(messages: ConsoleMessage[]): this {
    this.consoleMessages.push(...messages);
    return this;
  }

  /**
   * Set authentication status
   */
  setAuthStatus(username?: string, role?: string): this {
    this.authUser = username;
    this.authRole = role;
    return this;
  }

  /**
   * Set Kibana application state
   */
  setKibanaState(app?: string, route?: string, context?: Record<string, unknown>): this {
    this.kibanaApp = app;
    this.kibanaRoute = route;
    this.kibanaContext = context;
    return this;
  }

  /**
   * Add a custom section to the response
   */
  addSection(title: string, content: string): this {
    this.additionalSections[title] = content;
    return this;
  }

  /**
   * Build the final structured response
   */
  build(): string {
    const sections: string[] = [];

    // Result or Error section (always first)
    if (this.errorMessage) {
      sections.push(`### Error\n${this.errorMessage}`);
    } else if (this.resultMessage) {
      sections.push(`### Result\n${this.resultMessage}`);
    }

    // Executed code section (for transparency and learning)
    if (this.executedCode.length > 0) {
      sections.push('### Executed code');
      for (const { code, language } of this.executedCode) {
        sections.push(`\`\`\`${language}\n${code}\n\`\`\``);
      }
    }

    // Page state section
    if (this.pageUrl || this.pageTitle) {
      const pageStateLines: string[] = ['### Page state'];
      if (this.pageUrl) pageStateLines.push(`- URL: ${this.pageUrl}`);
      if (this.pageTitle) pageStateLines.push(`- Title: ${this.pageTitle}`);
      if (this.pageSnapshot) {
        pageStateLines.push('- Snapshot:');
        pageStateLines.push('```yaml');
        pageStateLines.push(this.pageSnapshot);
        pageStateLines.push('```');
      }
      sections.push(pageStateLines.join('\n'));
    }

    // Kibana app state section
    if (this.kibanaApp || this.kibanaRoute || this.kibanaContext) {
      const kibanaLines: string[] = ['### Kibana app state'];
      if (this.kibanaApp) kibanaLines.push(`- Current app: ${this.kibanaApp}`);
      if (this.kibanaRoute) kibanaLines.push(`- Route: ${this.kibanaRoute}`);
      if (this.kibanaContext && Object.keys(this.kibanaContext).length > 0) {
        kibanaLines.push('- Context:');
        kibanaLines.push('```json');
        kibanaLines.push(JSON.stringify(this.kibanaContext, null, 2));
        kibanaLines.push('```');
      }
      sections.push(kibanaLines.join('\n'));
    }

    // Authentication status section
    if (this.authUser || this.authRole) {
      const authLines: string[] = ['### Authentication status'];
      if (this.authUser) authLines.push(`- User: ${this.authUser}`);
      if (this.authRole) authLines.push(`- Role: ${this.authRole}`);
      sections.push(authLines.join('\n'));
    }

    // Console messages section (if any new messages)
    if (this.consoleMessages.length > 0) {
      const consoleLines: string[] = ['### New console messages'];
      for (const msg of this.consoleMessages) {
        consoleLines.push(`- [${msg.type}] ${msg.message}`);
      }
      sections.push(consoleLines.join('\n'));
    }

    // Additional custom sections
    for (const [title, content] of Object.entries(this.additionalSections)) {
      sections.push(`### ${title}\n${content}`);
    }

    return sections.join('\n\n');
  }

  /**
   * Build and return as a ToolResult object
   */
  buildAsToolResult(): ToolResult {
    const content = this.build();
    if (this.errorMessage) {
      return error(this.errorMessage, content);
    }
    return success(content, this.resultMessage);
  }
}
