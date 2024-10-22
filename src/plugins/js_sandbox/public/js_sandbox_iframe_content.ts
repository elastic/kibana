/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export function getUnableToParseIframeMessage() {
  return `
    <!DOCTYPE html>
    <html>
      <body>
        <div id="root">Unable to parse user input</div>
      </body>
    </html>
  `;
}

export function getIframeContent(iframeID: string, hashedJs: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <script src="https://unpkg.com/react@17.0.2/umd/react.development.js"></script>
        <script src="https://unpkg.com/react-dom@17.0.2/umd/react-dom.development.js"></script>
        <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

        <script src="https://cdn.jsdelivr.net/npm/vega@5"></script>
        <script src="https://cdn.jsdelivr.net/npm/vega-lite@5"></script>
        <script src="https://cdn.jsdelivr.net/npm/vega-lite-api@5.6.0"></script>
        <script src="https://cdn.jsdelivr.net/npm/vega-tooltip"></script>
      </head>
      <body>
        <div id="root"></div>
        <script>
          let UserComponent = () => null;
          let data;
          let width;
          let height;

          function updateWidthHeight() {
            width = Math.max(document.documentElement.clientWidth - 72 || 0, window.innerWidth - 72 || 0);
            height = Math.max(document.documentElement.clientHeight - 48 || 0, window.innerHeight - 48 || 0);
          }

          function updateData(dataString) {
            try {
              data = JSON.parse(dataString);
              return true
            } catch (e) {
              window.parent.postMessage({ source: '${iframeID}', type: 'error', payload: {
                errorType: 'Error parsing data',
                error: e
              }});
              return false;
            }
          }

          function dispatch(crossfilter) {
            if (typeof crossfilter === 'string') {
              window.parent.postMessage(
                { source: '${iframeID}', type: 'crossfilter', payload: crossfilter }, '*'
              );
            } else {
              console.error('Crossfilter data must be a string');
            }
          }

          window.addEventListener('resize', function(event) {
            renderUserComponent();
          }, true);

          // Function to render UserComponent with the provided data
          const renderUserComponent = function() {
            updateWidthHeight();

            try {
              if (typeof UserComponent === 'function') {
                ReactDOM.render(
                  React.createElement(UserComponent, { data, width, height, dispatch }),
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
              const dataOk = updateData(event.data.payload);

              if (dataOk) {
                renderUserComponent();
              }
            }
          });
        </script>
      </body>
    </html>
  `;
}
