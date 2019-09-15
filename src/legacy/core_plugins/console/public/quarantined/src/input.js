/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Autocomplete from './autocomplete';
import mappings from './mappings';
const SenseEditor = require('./sense_editor/editor');
const utils = require('./utils');
const es = require('./es');

let input;
export function initializeInput($el, $actionsEl, history, settings) {
  input = new SenseEditor($el);

  input.autocomplete = new Autocomplete(input);

  input.$actions = $actionsEl;

  /**
   * Setup the "send" shortcut
   */

  let CURRENT_REQ_ID = 0;

  function sendCurrentRequestToES(addedToHistoryCb, output, progressBar) {

    const reqId = ++CURRENT_REQ_ID;

    if (progressBar) {
      progressBar.current.resetProgress();
      progressBar.current.startProgress();
    }

    input.getRequestsInRange(function (requests) {
      if (reqId !== CURRENT_REQ_ID) {
        return;
      }
      if (output) {
        output.update('');
      }

      if (requests.length === 0) {
        return;
      }

      const isMultiRequest = requests.length > 1;
      const finishChain = function () {
        if (progressBar) {
          progressBar.current.resetProgress();
        }
      };

      let isFirstRequest = true;

      const sendNextRequest = () => {
        if (reqId !== CURRENT_REQ_ID) {
          return;
        }
        if (requests.length === 0) {
          finishChain();
          return;
        }
        const req = requests.shift();
        const esPath = req.url;
        const esMethod = req.method;
        let esData = utils.collapseLiteralStrings(req.data.join('\n'));
        if (esData) {
          esData += '\n';
        } //append a new line for bulk requests.

        es.send(esMethod, esPath, esData).always((dataOrjqXHR, textStatus, jqXhrORerrorThrown) => {
          if (reqId !== CURRENT_REQ_ID) {
            return;
          }

          const xhr = dataOrjqXHR.promise ? dataOrjqXHR : jqXhrORerrorThrown;

          function modeForContentType(contentType) {
            if (contentType.indexOf('text/plain') >= 0) {
              return 'ace/mode/text';
            } else if (contentType.indexOf('application/yaml') >= 0) {
              return 'ace/mode/yaml';
            }
            return null;
          }

          const isSuccess =
            typeof xhr.status === 'number' &&
            // Things like DELETE index where the index is not there are OK.
            ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 404);

          if (isSuccess) {
            if (xhr.status !== 404 && settings.getPolling()) {
              // If the user has submitted a request against ES, something in the fields, indices, aliases,
              // or templates may have changed, so we'll need to update this data. Assume that if
              // the user disables polling they're trying to optimize performance or otherwise
              // preserve resources, so they won't want this request sent either.
              mappings.retrieveAutoCompleteInfo();
            }

            // we have someone on the other side. Add to history
            history.addToHistory(esPath, esMethod, esData);
            if (addedToHistoryCb) {
              addedToHistoryCb();
            }

            let value = xhr.responseText;
            const mode = modeForContentType(xhr.getAllResponseHeaders('Content-Type') || '');

            // Apply triple quotes to output.
            if (settings.getTripleQuotes() && (mode === null || mode === 'application/json')) {
              // assume json - auto pretty
              try {
                value = utils.expandLiteralStrings(value);
              } catch (e) {
                // nothing to do here
              }
            }

            const warnings = xhr.getResponseHeader('warning');
            if (warnings) {
              const deprecationMessages = utils.extractDeprecationMessages(warnings);
              value = deprecationMessages.join('\n') + '\n' + value;
            }

            if (isMultiRequest) {
              value = '# ' + req.method + ' ' + req.url + '\n' + value;
            }

            if (output) {
              if (isFirstRequest) {
                output.update(value, mode);
              } else {
                output.append('\n' + value);
              }
            }

            isFirstRequest = false;
            // single request terminate via sendNextRequest as well
            sendNextRequest();
          } else {
            let value;
            let mode;
            if (xhr.responseText) {
              value = xhr.responseText; // ES error should be shown
              mode = modeForContentType(xhr.getAllResponseHeaders('Content-Type') || '');
              if (value[0] === '{') {
                try {
                  value = JSON.stringify(JSON.parse(value), null, 2);
                } catch (e) {
                  // nothing to do here
                }
              }
            } else {
              value = 'Request failed to get to the server (status code: ' + xhr.status + ')';
              mode = 'ace/mode/text';
            }
            if (isMultiRequest) {
              value = '# ' + req.method + ' ' + req.url + '\n' + value;
            }
            if (output) {
              if (isFirstRequest) {
                output.update(value, mode);
              } else {
                output.append('\n' + value);
              }
            }
            finishChain();
          }
        });
      };

      sendNextRequest();
    });
  }

  /**
   * Init the editor
   */
  if (settings) {
    settings.applyCurrentSettings(input);
  }
  input.focus();
  input.highlightCurrentRequestsAndUpdateActionBar();

  input.sendCurrentRequestToES = sendCurrentRequestToES;

  return input;
}

export default function getInput() {
  return input;
}
