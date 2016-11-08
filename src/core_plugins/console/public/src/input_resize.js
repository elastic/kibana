import $ from 'jquery';
import storage from './storage';

module.exports = function (input, output) {

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

  var $resizer = $('#editor_resizer');
  $resizer
    .on('mousedown', function (event) {
      $resizer.addClass('active');
      var startWidth = $left.width();
      var startX = event.pageX;

      function onMove(event) {
        setEditorWidth(startWidth + event.pageX - startX)
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
