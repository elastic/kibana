/* eslint-disable */

let isButtonCollapsed = true;
const $toggleButton = $('[data-id="toggleButton"]');
const $toggleButtonIcon = $('[data-id="toggleButtonIcon"]');

$toggleButton.on('click', () => {
  isButtonCollapsed = !isButtonCollapsed;

  if (isButtonCollapsed) {
    $toggleButtonIcon.addClass('fa-caret-right');
    $toggleButtonIcon.removeClass('fa-caret-down');
  } else {
    $toggleButtonIcon.removeClass('fa-caret-right');
    $toggleButtonIcon.addClass('fa-caret-down');
  }
});
