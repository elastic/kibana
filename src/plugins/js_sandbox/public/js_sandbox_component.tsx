/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC } from 'react';

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
  // The runUserCode function evaluates the provided component code.
  // This function uses eval() to execute user code, but it’s done within
  // the controlled iframe to mitigate security risks.
  const iframeContent = `
  <!DOCTYPE html>
  <html>
    <head>
      <script src="https://unpkg.com/react/umd/react.development.js"></script>
      <script src="https://unpkg.com/react-dom/umd/react-dom.development.js"></script>
    </head>
    <body>
      <div id="root"></div>
      <script>
        // Function to evaluate and render user component
        window.runUserCode = function(userCode) {
          try {
            // Wrap the user code to define and use the functional component
            const wrappedCode = \`
              (function() {
                // Evaluate user code to create the component
                \${userCode}
                // Assume the user provides a component named "UserComponent"
                ReactDOM.render(
                  React.createElement(UserComponent, null),
                  document.getElementById('root')
                );
              })();
            \`;
            eval(wrappedCode);
          } catch (e) {
            console.error('Error:', e);
          }
        };
      </script>
    </body>
  </html>
`;

  return (
    <iframe
      title="js_sandbox"
      // srcdoc allows you to directly define the content that will be inside the iframe
      srcDoc={iframeContent}
      // sandbox attribute ensures that the JavaScript is isolated:
      // - `allow-scripts`: Allows JavaScript execution.
      // - Excluding `allow-same-origin` means that the code inside cannot
      //   access cookies or local storage of your site,
      //   providing additional security.
      sandbox="allow-scripts"
      width="100%"
      height="100%"
    />
  );
};
