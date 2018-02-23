import $ from 'jquery';

module.exports = function () {
	const $fieldPanel = $('#discover_field');
	const $fieldSidebar = $('#discover_field .sidebar-list');
	var $resizer = $('#discover_resizer');

	function setEditorWidth(editorWidth) {
		$fieldPanel.width(editorWidth);
		$fieldSidebar.width(editorWidth);
	}

	$resizer
	.on('mousedown', function (event) {
	  $resizer.addClass('active');
	  var startWidth = $fieldPanel.width();
	  var startX = event.pageX;

	  function onMove(event) {
	    setEditorWidth(startWidth + event.pageX - startX);
	  }

	  $(document.body)
	    .on('mousemove', onMove)
	    .one('mouseup', function () {
	      $resizer.removeClass('active');
	      $(this).off('mousemove', onMove);
	    });
	});
}
