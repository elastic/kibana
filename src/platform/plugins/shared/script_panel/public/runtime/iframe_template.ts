/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SandboxConfig } from './types';

/**
 * Generates the iframe runtime code that handles RPC communication
 * and exposes the Kibana API to user scripts.
 */
const generateRuntimeCode = (config: SandboxConfig): string => `
// ============================================
// KIBANA SCRIPT PANEL RUNTIME
// ============================================

(function() {
  'use strict';

  let requestId = 0;
  const pendingRequests = new Map();
  const eventHandlers = new Map();

  // Generate unique request ID
  function nextRequestId() {
    return 'req_' + (++requestId);
  }

  // Send RPC request to host and return promise
  function sendRequest(method, params) {
    return new Promise((resolve, reject) => {
      const id = nextRequestId();
      const timeout = setTimeout(() => {
        pendingRequests.delete(id);
        reject(new Error('Request timeout: ' + method));
      }, ${config.queryTimeout});

      pendingRequests.set(id, { resolve, reject, timeout });

      parent.postMessage({
        type: 'request',
        id: id,
        method: method,
        params: params
      }, '*');
    });
  }

  // Handle incoming messages from host
  window.addEventListener('message', function(event) {
    const msg = event.data;
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'response') {
      const pending = pendingRequests.get(msg.id);
      if (pending) {
        pendingRequests.delete(msg.id);
        clearTimeout(pending.timeout);
        if (msg.error) {
          pending.reject(new Error(msg.error.message || 'Unknown error'));
        } else {
          pending.resolve(msg.result);
        }
      }
    } else if (msg.type === 'event') {
      const handlers = eventHandlers.get(msg.event);
      if (handlers) {
        handlers.forEach(function(handler) {
          try {
            handler(msg.data);
          } catch (e) {
            console.error('Event handler error:', e);
          }
        });
      }
    }
  });

  // Subscribe to events from host
  function on(event, handler) {
    if (!eventHandlers.has(event)) {
      eventHandlers.set(event, new Set());
    }
    eventHandlers.get(event).add(handler);
    return function() {
      eventHandlers.get(event).delete(handler);
    };
  }

  // ============================================
  // PUBLIC API - Exposed to user scripts
  // ============================================

  window.Kibana = Object.freeze({
    /**
     * Execute an ES|QL query
     * @param {Object} options - Query options
     * @param {string} options.query - The ES|QL query string
     * @param {Object} [options.params] - Named parameters for the query
     * @param {boolean} [options.useContext=true] - Whether to apply dashboard context (time, filters)
     * @returns {Promise<{columns: Array, rows: Array, rowCount: number}>}
     */
    esql: Object.freeze({
      query: function(options) {
        if (!options || typeof options.query !== 'string') {
          return Promise.reject(new Error('esql.query requires a query string'));
        }
        if (options.query.length > ${config.maxQueryLength}) {
          return Promise.reject(new Error('Query exceeds maximum length'));
        }
        return sendRequest('esql.query', {
          query: options.query,
          params: options.params,
          useContext: options.useContext !== false
        });
      }
    }),

    /**
     * Panel utilities
     */
    panel: Object.freeze({
      getSize: function() {
        return sendRequest('panel.getSize', {});
      },
      onResize: function(callback) {
        return on('resize', callback);
      }
    }),

    /**
     * Render content to the panel
     */
    render: Object.freeze({
      setContent: function(html) {
        if (typeof html !== 'string') {
          return Promise.reject(new Error('render.setContent requires a string'));
        }
        return sendRequest('render.setContent', { html: html });
      },
      setError: function(message) {
        return sendRequest('render.setError', { message: String(message) });
      }
    }),

    /**
     * Logging utilities - captured by host
     */
    log: Object.freeze({
      info: function() {
        var args = Array.prototype.slice.call(arguments);
        sendRequest('log.info', { args: args });
      },
      warn: function() {
        var args = Array.prototype.slice.call(arguments);
        sendRequest('log.warn', { args: args });
      },
      error: function() {
        var args = Array.prototype.slice.call(arguments);
        sendRequest('log.error', { args: args });
      }
    })
  });

  // Notify host that runtime is ready
  parent.postMessage({ type: 'event', event: 'ready' }, '*');
})();
`;

/**
 * Generates the complete iframe srcDoc HTML with CSP and runtime.
 */
export const generateIframeSrcDoc = (userCode: string, config: SandboxConfig): string => {
  // Escape the user code for safe embedding in script tag
  // We use a script element with textContent approach which is safer than string interpolation
  const escapedUserCode = userCode
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'none';
    script-src 'unsafe-inline' 'unsafe-eval';
    style-src 'unsafe-inline';
    connect-src 'none';
    img-src data: blob:;
  ">
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #343741;
      background: transparent;
      overflow: auto;
    }
    #root {
      width: 100%;
      height: 100%;
    }
    .script-panel-error {
      padding: 16px;
      color: #bd271e;
      background: #fff9f8;
      border: 1px solid #f5c6cb;
      border-radius: 4px;
      margin: 8px;
    }
    .script-panel-error h4 {
      margin: 0 0 8px;
      font-weight: 600;
    }
    .script-panel-error pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    ${generateRuntimeCode(config)}
  </script>
  <script>
    // User code execution with error handling
    (function() {
      'use strict';
      try {
        ${escapedUserCode}
      } catch (e) {
        var errorDiv = document.createElement('div');
        errorDiv.className = 'script-panel-error';
        errorDiv.innerHTML = '<h4>Script Error</h4><pre>' + 
          (e.message || String(e)).replace(/</g, '&lt;').replace(/>/g, '&gt;') + 
          '</pre>';
        document.getElementById('root').appendChild(errorDiv);
        Kibana.log.error('Script execution error:', e.message || String(e));
      }
    })();
  </script>
</body>
</html>`;
};

/**
 * Generates a loading state srcDoc shown while script is initializing.
 */
export const generateLoadingSrcDoc = (): string => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #69707d;
      background: transparent;
    }
    .loading {
      text-align: center;
    }
    .spinner {
      width: 24px;
      height: 24px;
      border: 2px solid #d3dae6;
      border-top-color: #006bb4;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 8px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="loading">
    <div class="spinner"></div>
    <div>Loading script...</div>
  </div>
</body>
</html>`;

/**
 * Generates an error state srcDoc.
 */
export const generateErrorSrcDoc = (message: string): string => {
  const escapedMessage = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    html, body {
      margin: 0;
      padding: 16px;
      width: 100%;
      height: 100%;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: transparent;
    }
    .error {
      padding: 16px;
      color: #bd271e;
      background: #fff9f8;
      border: 1px solid #f5c6cb;
      border-radius: 4px;
    }
    .error h4 {
      margin: 0 0 8px;
      font-weight: 600;
    }
    .error pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="error">
    <h4>Script Panel Error</h4>
    <pre>${escapedMessage}</pre>
  </div>
</body>
</html>`;
};
