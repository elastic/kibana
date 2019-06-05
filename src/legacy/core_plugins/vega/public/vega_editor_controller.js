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

import compactStringify from 'json-stringify-pretty-compact';
import hjson from 'hjson';
import { uiModules } from 'ui/modules';

import 'ui/accessibility/kbn_ui_ace_keyboard_mode';
import { toastNotifications } from 'ui/notify';
import { i18n } from '@kbn/i18n';

const module = uiModules.get('kibana/vega', ['kibana']);
module.controller('VegaEditorController', ($scope /*, kbnUiAceKeyboardModeService*/) => {
  return new (class VegaEditorController {
    constructor() {
      $scope.aceLoaded = (editor) => {
        editor.$blockScrolling = Infinity;

        const session = editor.getSession();
        session.setTabSize(2);
        session.setUseSoftTabs(true);

        this.aceEditor = editor;
      };

      $scope.formatJson = (event) => {
        this._format(event, compactStringify, {
          maxLength: this._getCodeWidth(),
        });
      };

      $scope.formatHJson = (event) => {
        this._format(event, hjson.stringify, {
          condense: this._getCodeWidth(),
          bracesSameLine: true,
          keepWsc: true,
        });
      };
    }

    _getCodeWidth() {
      return this.aceEditor.getSession().getWrapLimit();
    }

    _format(event, stringify, opts) {
      event.preventDefault();

      let newSpec;
      try {
        const spec = hjson.parse(this.aceEditor.getSession().doc.getValue(), { legacyRoot: false, keepWsc: true });
        newSpec = stringify(spec, opts);
      } catch (err) {
        // This is a common case - user tries to format an invalid HJSON text
        toastNotifications.addError(err, {
          title: i18n.translate('vega.editor.formatError', {
            defaultMessage: 'Error formatting spec',
          }),
        });
        return;
      }

      // ui-ace only accepts changes from the editor when they
      // happen outside of a digest cycle
      // Per @spalger, we used $$postDigest() instead of setTimeout(() => {}, 0)
      // because it better described the intention.
      $scope.$$postDigest(() => {
        // set the new value to the session doc so that it
        // is treated as an edit by ace: ace adds it to the
        // undo stack and emits it as a change like all
        // other edits
        this.aceEditor.getSession().doc.setValue(newSpec);
      });
    }
  })();
});
