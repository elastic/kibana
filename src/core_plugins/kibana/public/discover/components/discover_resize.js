import $ from 'jquery';

module.exports = function () {
	const $fieldPanel = $('#discover-sidebar');
	const $fieldSidebar = $('#discover-sidebar .sidebar-list');
	const $resizer = $('#discover_resizer');
	const $container = $('.discover_container');
	const $contentPanel = $('#discover_content');
	const paddingWidth = 21;


	function setEditorWidth(editorWidth) {
		$fieldPanel.width(editorWidth);
		$fieldSidebar.width(editorWidth);

		const totalW = $container.width();
		$contentPanel.width(totalW - editorWidth - paddingWidth);
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
