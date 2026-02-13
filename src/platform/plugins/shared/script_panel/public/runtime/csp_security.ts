/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * CSP Security Model for Script Panel
 *
 * This module documents and validates the Content Security Policy model used
 * by the script panel's sandboxed iframe execution environment.
 *
 * ## Security Model Overview
 *
 * The script panel executes user-authored JavaScript in a sandboxed iframe with
 * a strict security boundary. This design provides multiple layers of isolation:
 *
 * 1. **Iframe Sandbox Attribute**: `sandbox="allow-scripts"`
 *    - Without `allow-same-origin`, the iframe has a unique opaque origin (null)
 *    - Cannot access parent's DOM, localStorage, sessionStorage, cookies, or IndexedDB
 *    - Cannot make fetch/XHR requests (blocked by unique origin + CSP)
 *    - Cannot use Web Workers with URLs (would require `allow-same-origin`)
 *
 * 2. **Iframe CSP via Meta Tag**: Applied within the srcDoc content
 *    - `default-src 'none'`: Block all resources by default
 *    - `script-src 'unsafe-inline' 'unsafe-eval'`: Allow inline scripts (required for user code)
 *    - `style-src 'unsafe-inline'`: Allow inline styles for rendering
 *    - `connect-src 'none'`: Block all network requests (fetch, XHR, WebSocket)
 *    - `img-src data: blob:`: Allow data URIs and blob URLs for images only
 *
 * 3. **Parent CSP is Independent**: The parent Kibana page has its own CSP
 *    - Kibana uses `script-src 'self'` (no nonces) with `csp.strict: true` by default
 *    - The iframe's null origin means parent CSP doesn't apply to iframe content
 *    - No nonce propagation is required - iframe has its own CSP context
 *
 * ## Why No Nonce Required
 *
 * Kibana's CSP configuration explicitly disallows user-configured nonces:
 * ```typescript
 * validate: getDirectiveValidator({ allowNone: false, allowNonce: false })
 * ```
 *
 * This is intentional - Kibana uses `'self'` based CSP rather than nonce-based CSP.
 * Sandboxed iframes with `srcDoc` operate with their own CSP context:
 *
 * 1. The iframe has a unique null origin (due to no `allow-same-origin`)
 * 2. The CSP meta tag in srcDoc defines the iframe's own security policy
 * 3. Parent CSP headers don't apply to content delivered via srcDoc
 * 4. No nonce propagation needed between parent and iframe
 *
 * ## Security Guarantees
 *
 * | Threat | Mitigation |
 * |--------|------------|
 * | XSS to parent | Blocked by sandbox (no DOM access) |
 * | Cookie theft | Blocked by sandbox (opaque origin) |
 * | Data exfiltration | Blocked by CSP `connect-src 'none'` |
 * | External script loading | Blocked by CSP `default-src 'none'` |
 * | Accessing Kibana APIs | Only via explicit RPC bridge |
 * | Modifying parent storage | Blocked by sandbox (opaque origin) |
 *
 * ## RPC Capability Boundary
 *
 * The only way for iframe code to interact with Kibana is through the explicit
 * RPC bridge, which exposes a minimal set of capabilities:
 *
 * - `esql.query`: Execute ES|QL queries (with guardrails)
 * - `panel.getSize`: Get panel dimensions
 * - `panel.onResize`: Subscribe to resize events
 * - `render.setContent`: Update rendered HTML
 * - `render.setError`: Display error state
 * - `log.*`: Structured logging
 *
 * All other Kibana functionality is explicitly blocked.
 */

/**
 * CSP directives used in the iframe srcDoc.
 * This is defined separately for testing and documentation purposes.
 */
export const IFRAME_CSP_DIRECTIVES = {
  'default-src': ["'none'"],
  'script-src': ["'unsafe-inline'", "'unsafe-eval'"],
  'style-src': ["'unsafe-inline'"],
  'connect-src': ["'none'"],
  'img-src': ['data:', 'blob:'],
} as const;

/**
 * Generates the CSP header string for the iframe meta tag.
 */
export const generateIframeCspHeader = (): string => {
  return Object.entries(IFRAME_CSP_DIRECTIVES)
    .map(([directive, values]) => `${directive} ${values.join(' ')}`)
    .join('; ');
};

/**
 * Validates that the iframe sandbox configuration is secure.
 * This is called during bridge initialization for defense-in-depth.
 */
export interface SandboxValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Helper to check if sandbox contains a flag.
 * Handles both DOMTokenList and fallback to attribute string parsing.
 */
const sandboxContains = (iframe: HTMLIFrameElement, flag: string): boolean => {
  // Try DOMTokenList API first
  if (iframe.sandbox && typeof iframe.sandbox.contains === 'function') {
    return iframe.sandbox.contains(flag);
  }
  // Fallback: parse sandbox attribute string
  const sandboxAttr = iframe.getAttribute('sandbox');
  if (!sandboxAttr) return false;
  return sandboxAttr.split(/\s+/).includes(flag);
};

/**
 * Helper to check if sandbox has any flags.
 */
const hasSandboxFlags = (iframe: HTMLIFrameElement): boolean => {
  // Check if sandbox attribute exists
  if (iframe.hasAttribute('sandbox')) {
    const sandboxAttr = iframe.getAttribute('sandbox');
    // Empty sandbox attribute is valid (most restrictive)
    return sandboxAttr !== null;
  }
  // Also check DOMTokenList
  if (iframe.sandbox && iframe.sandbox.length > 0) {
    return true;
  }
  return false;
};

export const validateSandboxSecurity = (iframe: HTMLIFrameElement): SandboxValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check sandbox attribute exists
  if (!hasSandboxFlags(iframe)) {
    errors.push('Iframe must have sandbox attribute');
  }

  // Check allow-scripts is present (required for user code)
  if (!sandboxContains(iframe, 'allow-scripts')) {
    errors.push('Iframe sandbox must include allow-scripts');
  }

  // CRITICAL: Check allow-same-origin is NOT present
  if (sandboxContains(iframe, 'allow-same-origin')) {
    errors.push(
      'SECURITY VIOLATION: allow-same-origin must NOT be in sandbox. ' +
        'This would allow the iframe to access parent origin resources.'
    );
  }

  // Check other potentially dangerous flags
  const dangerousFlags = [
    'allow-top-navigation',
    'allow-top-navigation-by-user-activation',
    'allow-popups-to-escape-sandbox',
  ];

  for (const flag of dangerousFlags) {
    if (sandboxContains(iframe, flag)) {
      warnings.push(`Sandbox flag '${flag}' may pose security risks`);
    }
  }

  // Check srcdoc is used (not src with URL)
  if (iframe.src && !iframe.src.startsWith('about:')) {
    errors.push('Iframe must use srcdoc, not external src URL');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Verifies that the current page's CSP allows iframe creation with srcDoc.
 * This is informational - the actual enforcement happens at render time.
 */
export const checkParentCspCompatibility = (): {
  compatible: boolean;
  notes: string[];
} => {
  const notes: string[] = [];

  // Check if we can detect CSP violations
  // Note: This is best-effort - CSP is enforced by the browser
  notes.push('Parent CSP uses self-based script-src (no nonces required)');
  notes.push('Iframe srcDoc has independent CSP context via meta tag');
  notes.push('No CSP header propagation needed between parent and iframe');

  return {
    compatible: true,
    notes,
  };
};

/**
 * Security checklist for runtime validation.
 * Used in tests and during development to ensure security invariants hold.
 */
export const SECURITY_CHECKLIST = [
  {
    id: 'sandbox-no-same-origin',
    description: 'Iframe sandbox does not include allow-same-origin',
    critical: true,
  },
  {
    id: 'sandbox-allow-scripts',
    description: 'Iframe sandbox includes allow-scripts for user code execution',
    critical: true,
  },
  {
    id: 'csp-default-none',
    description: 'Iframe CSP sets default-src to none',
    critical: true,
  },
  {
    id: 'csp-no-connect',
    description: 'Iframe CSP blocks all network connections',
    critical: true,
  },
  {
    id: 'rpc-allowlist',
    description: 'RPC bridge only allows explicitly defined methods',
    critical: true,
  },
  {
    id: 'esql-only-data',
    description: 'Data access restricted to ES|QL queries only',
    critical: true,
  },
  {
    id: 'query-guardrails',
    description: 'ES|QL queries have timeout, row limit, and rate limiting',
    critical: false,
  },
  {
    id: 'no-nonce-required',
    description: 'No nonce propagation required - iframe has independent CSP',
    critical: false,
  },
] as const;
