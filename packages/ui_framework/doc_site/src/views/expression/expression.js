/* eslint-disable */

let isPopoverCollapsed = true;
const $toggleExpressionButton = $('[data-id="toggleExpressionButton"]');
const $toggleExpressionPopover = $('[data-id="toggleExpressionPopover"]');

$('[data-id="toggleExpressionButton"]').click(function() {

  if (isPopoverCollapsed) {
    $(this).addClass('kuiExpressionItem__button--isActive')
    $(this).parent( "div" ).find('[data-id="toggleExpressionPopover"]').removeClass('kuiExpressionItem__popover--isHidden');
  } else {
    $(this).removeClass('kuiExpressionItem__button--isActive')
    $(this).parent( "div" ).find('[data-id="toggleExpressionPopover"]').addClass('kuiExpression__popover--isHidden');
  }

  isPopoverCollapsed = !isPopoverCollapsed;
});

$(document).mouseup(function(e) {
  if (!isPopoverCollapsed && !$toggleExpressionPopover.is(e.target) && $toggleExpressionPopover.has(e.target).length === 0) {
    $toggleExpressionPopover.addClass('kuiExpressionItem__popover--isHidden');
    $toggleExpressionButton.removeClass('kuiExpressionItem__button--isActive');
    isPopoverCollapsed = !isPopoverCollapsed;
  }
});
