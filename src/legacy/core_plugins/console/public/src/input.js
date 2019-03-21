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

require('brace');
require('brace/ext/searchbox');
import  Autocomplete from './autocomplete';
const SenseEditor = require('./sense_editor/editor');
const settings = require('./settings');
const utils = require('./utils');
const es = require('./es');
const history = require('./history');
import { uiModules } from 'ui/modules';

let input;
export function initializeInput($el, $actionsEl, $copyAsCurlEl, output, openDocumentation = () => {}) {
  input = new SenseEditor($el);

  // this may not exist if running from tests
  if (uiModules) {
    const appSense = uiModules.get('app/sense');
    if (appSense && appSense.setupResizeCheckerForRootEditors) {
      appSense.setupResizeCheckerForRootEditors($el, input, output);
    }
  }

  input.autocomplete = new Autocomplete(input);

  input.$actions = $actionsEl;

  input.commands.addCommand({
    name: 'auto indent request',
    bindKey: { win: 'Ctrl-I', mac: 'Command-I' },
    exec: function () {
      input.autoIndent();
    }
  });
  input.commands.addCommand({
    name: 'move to previous request start or end',
    bindKey: { win: 'Ctrl-Up', mac: 'Command-Up' },
    exec: function () {
      input.moveToPreviousRequestEdge();
    }
  });
  input.commands.addCommand({
    name: 'move to next request start or end',
    bindKey: { win: 'Ctrl-Down', mac: 'Command-Down' },
    exec: function () {
      input.moveToNextRequestEdge();
    }
  });

  /**
   * Setup the "send" shortcut
   */

  let CURRENT_REQ_ID = 0;

  function sendCurrentRequestToES() {

    const reqId = ++CURRENT_REQ_ID;

    input.getRequestsInRange(function (requests) {
      if (reqId !== CURRENT_REQ_ID) {
        return;
      }
      output.update('');

      if (requests.length === 0) {
        return;
      }

      const isMultiRequest = requests.length > 1;
      const finishChain = function () { /* noop */ };

      let isFirstRequest = true;

      const sendNextRequest = function () {
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

        es.send(esMethod, esPath, esData).always(function (dataOrjqXHR, textStatus, jqXhrORerrorThrown) {
          if (reqId !== CURRENT_REQ_ID) {
            return;
          }
          let xhr;
          if (dataOrjqXHR.promise) {
            xhr = dataOrjqXHR;
          }
          else {
            xhr = jqXhrORerrorThrown;
          }
          function modeForContentType(contentType) {
            if (contentType.indexOf('text/plain') >= 0) {
              return 'ace/mode/text';
            }
            else if (contentType.indexOf('application/yaml') >= 0) {
              return 'ace/mode/yaml';
            }
            return null;
          }

          if (typeof xhr.status === 'number' &&
          // things like DELETE index where the index is not there are OK.
            ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 404)
          ) {
            // we have someone on the other side. Add to history
            history.addToHistory(esPath, esMethod, esData);


            let value = xhr.responseText;
            const mode = modeForContentType(xhr.getAllResponseHeaders('Content-Type') || '');

            if (mode === null || mode === 'application/json') {
              // assume json - auto pretty
              try {
                value = utils.expandLiteralStrings(value);
              }
              catch (e) {
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
            if (isFirstRequest) {
              output.update(value, mode);
            }
            else {
              output.append('\n' + value);
            }
            isFirstRequest = false;
            // single request terminate via sendNextRequest as well
            sendNextRequest();
          }
          else {
            let value;
            let mode;
            if (xhr.responseText) {
              value = xhr.responseText; // ES error should be shown
              mode = modeForContentType(xhr.getAllResponseHeaders('Content-Type') || '');
              if (value[0] === '{') {
                try {
                  value = JSON.stringify(JSON.parse(value), null, 2);
                }
                catch (e) {
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
            if (isFirstRequest) {
              output.update(value, mode);
            }
            else {
              output.append('\n' + value);
            }
            finishChain();
          }
        });
      };

      sendNextRequest();
    });
  }


  input.commands.addCommand({
    name: 'send to elasticsearch',
    bindKey: { win: 'Ctrl-Enter', mac: 'Command-Enter' },
    exec: sendCurrentRequestToES
  });
  input.commands.addCommand({
    name: 'open documentation',
    bindKey: { win: 'Ctrl-/', mac: 'Command-/' },
    exec: () => {
      openDocumentation();
    }
  });

  /**
   * Init the editor
   */
  if (settings) {
    settings.applyCurrentSettings(input);
  }
  input.focus();
  input.highlightCurrentRequestsAndUpdateActionBar();

  input.sendCurrentRequestToES = sendCurrentRequestToES;
  require('./input_resize')(input, output);

  return input;
}

export default function getInput() {
  return input;
}
