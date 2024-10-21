/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef, useState, type FC } from 'react';

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
 * - The `runUserCode` function evaluates the provided component code.
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
  // TODO Replace with result of user provided ES|QL query
  // State to manage the data prop that will be passed to the user's component
  const [data, setData] = useState({
    message: 'This is the initial predefined data provided by the SPA.',
  });

  // Ref to store the iframe reference
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // The runUserCode function evaluates the provided component code.
  // This function uses eval() to execute user code, but it’s done within
  // the controlled iframe to mitigate security risks.
  const iframeContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <script src="https://unpkg.com/react@17.0.2/umd/react.development.js"></script>
        <script src="https://unpkg.com/react-dom@17.0.2/umd/react-dom.development.js"></script>
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
              }
            } catch (e) {
              console.error('Render Error:', e);
            }
          };

          // Function to evaluate and render user component with JSX support
          const compileUserCode = function(userCode) {
            try {
              // Transpile the user code from JSX to JavaScript using Sucrase
              const transpiledCode = Babel.transform('UserComponent = ' + userCode, {
                presets: ['react']
              }).code;
              console.log('transpiledCode', transpiledCode);

              eval(transpiledCode);
            } catch (e) {
              console.error('Error:', e);
            }
          };


          document.addEventListener('DOMContentLoaded', function(event) {
            compileUserCode(${JSON.stringify(hashedJs)});
            console.log('UserComponent', UserComponent);

            ReactDOM.render(
              React.createElement(UserComponent, null),
              document.getElementById('root')
            );
          });

          // Listen for messages from the parent window
          window.addEventListener('message', function(event) {
            if (event.data.type === 'updateData') {
              renderUserComponent(event.data.payload);
            }
          });
        </script>
      </body>
    </html>
  `;

  // Effect to update the iframe when `data` changes
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'updateData', payload: data }, '*');
    }
  }, [data]);

  return (
    <iframe
      title="JS Sandbox"
      ref={iframeRef}
      sandbox="allow-scripts"
      srcDoc={iframeContent}
      style={{ width: '100%', height: '100%' }}
    />
  );
};
