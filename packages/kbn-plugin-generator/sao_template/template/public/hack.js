import $ from 'jquery';

$(document.body).on('keypress', function (event) {
  if (event.which === 58) {
    alert('boo!');
  }
});
