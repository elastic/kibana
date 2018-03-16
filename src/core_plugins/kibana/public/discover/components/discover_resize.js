import $ from 'jquery';

module.exports = function () {
	const $fieldPanel = $('#discover-sidebar');
	const $fieldSidebar = $('#discover-sidebar .sidebar-list');
	const $resizer = $('#discover_resizer');

	function setEditorWidth(editorWidth) {
		$fieldPanel.width(editorWidth);
		$fieldSidebar.width(editorWidth);
	}

	$resizer
	.on('mousedown', function (event) {
	  $resizer.addClass('active');
	  const startWidth = $fieldPanel.width();
	  const startX = event.pageX;

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
};
