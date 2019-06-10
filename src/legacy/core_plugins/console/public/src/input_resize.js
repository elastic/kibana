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
const storage = require('./storage');

export default function (input, output) {

  const $left = input.$el.parent();

  function readStoredEditorWidth() {
    return storage.get('editorWidth');
  }

  function storeEditorWidth(editorWidth) {
    storage.set('editorWidth', editorWidth);
  }

  function setEditorWidth(editorWidth) {
    storeEditorWidth(editorWidth);
    $left.width(editorWidth);
  }

  const $resizer = $('#ConAppResizer');
  $resizer
    .on('mousedown', function (event) {
      $resizer.addClass('active');
      const startWidth = $left.width();
      const startX = event.pageX;
      input.resize.topRow = input.renderer.layerConfig.firstRow;
      output.resize.topRow = output.renderer.layerConfig.firstRow;

      function onMove(event) {
        setEditorWidth(startWidth + event.pageX - startX);
      }

      $(document.body)
        .on('mousemove', onMove)
        .one('mouseup', function () {
          $resizer.removeClass('active');
          $(this).off('mousemove', onMove);
          input.resize();
          output.resize();
        });
    });

  const initialEditorWidth = readStoredEditorWidth();
  if (initialEditorWidth != null) {
    setEditorWidth(initialEditorWidth);
  }

}
