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

const $ = require('jquery');
const mappings = require('./mappings');

const DEFAULT_INPUT_VALUE = `GET _search
{
  "query": {
    "match_all": {}
  }
}`;

export default function init(input, output, history, sourceLocation = 'stored') {
  $(document.body).removeClass('fouc');

  // set the value of the input and clear the output
  function resetToValues(content) {
    input.update(content != null ? content : DEFAULT_INPUT_VALUE);
    output.update('');
  }

  function setupAutosave() {
    let timer;
    const saveDelay = 500;

    input.getSession().on('change', function onChange() {
      if (timer) {
        timer = clearTimeout(timer);
      }
      timer = setTimeout(saveCurrentState, saveDelay);
    });
  }

  function saveCurrentState() {
    try {
      const content = input.getValue();
      history.updateCurrentState(content);
    } catch (e) {
      console.log('Ignoring saving error: ' + e);
    }
  }
  function loadSavedState() {
    const previousSaveState = history.getSavedEditorState();

    if (sourceLocation === 'stored') {
      if (previousSaveState) {
        resetToValues(previousSaveState.content);
      } else {
        resetToValues();
      }
    } else if (/^https?:\/\//.test(sourceLocation)) {
      const loadFrom = {
        url: sourceLocation,
        // Having dataType here is required as it doesn't allow jQuery to `eval` content
        // coming from the external source thereby preventing XSS attack.
        dataType: 'text',
        kbnXsrfToken: false,
      };

      if (/https?:\/\/api.github.com/.test(sourceLocation)) {
        loadFrom.headers = { Accept: 'application/vnd.github.v3.raw' };
      }

      $.ajax(loadFrom).done(data => {
        resetToValues(data);
        input.moveToNextRequestEdge(true);
        input.highlightCurrentRequestsAndUpdateActionBar();
        input.updateActionsBar();
      });
    } else {
      resetToValues();
    }
    input.moveToNextRequestEdge(true);
  }

  setupAutosave();
  loadSavedState();
  mappings.retrieveAutoCompleteInfo();
}
