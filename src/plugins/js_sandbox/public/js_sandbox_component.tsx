/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useRef, useState, type FC } from 'react';

/**
 * JS Sandbox Component
 *
 * The iframe sandbox approach is the most straightforward for front-end-only
 * solutions and allows you to contain user-entered code securely.
 *
 * When allowing users to execute JavaScript, it's critical to:
 * - Limit what users can do, e.g., avoid allow-same-origin in iframes.
 * - Never eval() user-provided code directly in your main application context.
 * - Use a Content Security Policy (CSP) to limit what can be executed.
 *
 * Elements of this component:
 *
 * Sandboxed `iframe`:
 * - We use an `iframe` with `sandbox="allow-scripts"` to isolate the user’s code.
 * - The `srcdoc` attribute contains the HTML and JavaScript needed to load React,
 *   ReactDOM etc., and set up rendering.
 *
 * User Code Wrapping:
 * - The user input is required to provide a functional component.
 * - The `transpileUserCode` function evaluates the provided component code.
 * - This function uses eval() to execute user code, but it’s done within the
 *   controlled iframe to mitigate security risks.
 * - After evaluating the user code, it attempts to render a UserComponent
 *   using ReactDOM.render().
 *
 * Render Process:
 * - The UserComponent is rendered in the <div id="root"></div> element in
 *   the iframe. This ensures that the user's code and React components do not
 *   have access to the parent document.
 *
 * Security Considerations:
 * - Isolation: By using an iframe with sandbox="allow-scripts", we ensure
 *   that user code cannot access cookies, local storage, or interact with
 *   the parent application’s JavaScript context.
 * - Error Handling: Any errors during the rendering process are caught and
 *   logged to the console within the iframe. This could be extended by
 *   capturing errors and displaying them to the user in a controlled manner.
 *
 * @param param0
 * @returns
 */
export const JsSandboxComponent: FC<{ hashedJs: string }> = ({ hashedJs }) => {
  const iframeID = useMemo(() => Math.random().toString(36).substring(7), []);

  // TODO Replace with result of user provided ES|QL query
  // State to manage the data prop that will be passed to the user's component
  const [data, setData] = useState({
    message: 'This is the initial predefined data provided by the SPA.',
  });

  const [error, setError] = useState<{ errorType: string; error: Error } | null>(null);

  // Do not render iframe if user provided string doesn't start with `function(`
  // or if it contains global variables.
  const jsPassesBasicCheck = useMemo(() => {
    const globals = ['window', 'document', 'localStorage', 'sessionStorage', 'alert'];
    return hashedJs.startsWith('function(') && !globals.some((global) => hashedJs.includes(global));
  }, [hashedJs]);

  // Ref to store the iframe reference
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // The transpileUserCode function evaluates the provided component code.
  // This function uses eval() to execute user code, but it’s done within
  // the controlled iframe to mitigate security risks.
  const iframeContent = useMemo(() => {
    if (!jsPassesBasicCheck) {
      return `
      <!DOCTYPE html>
      <html>
        <body>
          <div id="root">Unable to parse user input</div>
        </body>
      </html>
      `;
    }

    return `
    <!DOCTYPE html>
    <html>
      <head>
        <script src="https://unpkg.com/react@17.0.2/umd/react.production.min.js"></script>
        <script src="https://unpkg.com/react-dom@17.0.2/umd/react-dom.production.min.js"></script>
        <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
      </head>
      <body>
        <div id="root"></div>
        <script>
          let UserComponent = () => null;

          // Function to render UserComponent with the provided data
          const renderUserComponent = function(data) {
            try {
              if (typeof UserComponent === 'function') {
                ReactDOM.render(
                  React.createElement(UserComponent, { data }),
                  document.getElementById('root')
                );
                window.parent.postMessage({ source: '${iframeID}', type: 'error', payload: null }, '*');
              } else {
                window.parent.postMessage({ source: '${iframeID}', type: 'error', payload: {
                  errorType: 'User provided code is not a function',
                  error: e
                } }, '*');
              }
            } catch (e) {
              window.parent.postMessage({ source: '${iframeID}', type: 'error', payload: {
                errorType: 'Render error',
                error: e
              } }, '*');
            }
          };

          // Function to evaluate and render user component with JSX support
          const transpileUserCode = function(userCode) {
            try {
              // Transpile the user code from JSX to JavaScript using Babel
              const transpiledCode = Babel.transform('UserComponent = ' + userCode, {
                presets: ['react']
              }).code;

              eval(transpiledCode);

              // iframe sends a "ready" message to the parent
              window.parent.postMessage({ source: '${iframeID}', type: 'iframeReady' }, '*');
              } catch (e) {
              window.parent.postMessage({ source: '${iframeID}', type: 'error', payload: {
                errorType: 'Error transpiling user input',
                error: e
              } }, '*');
            }
          };

          document.addEventListener('DOMContentLoaded', function(event) {
            transpileUserCode(${JSON.stringify(hashedJs)});
          });

          // Listen for messages from the parent window to receive data updates
          window.addEventListener('message', function(event) {
            if (event.data.type === 'updateData' && typeof UserComponent === 'function') {
              renderUserComponent(event.data.payload);
            }
          });
        </script>
      </body>
    </html>
  `;
  }, [jsPassesBasicCheck, hashedJs, iframeID]);

  // initial handshake with iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.source === iframeID) {
        if (event.data.type === 'iframeReady') {
          iframeRef.current?.contentWindow?.postMessage({ type: 'updateData', payload: data }, '*');
        } else if (event.data.type === 'error') {
          setError(event.data.payload);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect to update the iframe when `data` changes
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'updateData', payload: data }, '*');
    }
  }, [data]);

  return (
    <>
      {jsPassesBasicCheck && error && (
        <div>
          <h2>Error: {error.errorType}</h2>
          <pre>{error.error.message}</pre>
        </div>
      )}
      <iframe
        title="JS Sandbox"
        ref={iframeRef}
        sandbox="allow-scripts"
        srcDoc={iframeContent}
        style={{ width: '100%', height: '100%' }}
      />
    </>
  );
};
