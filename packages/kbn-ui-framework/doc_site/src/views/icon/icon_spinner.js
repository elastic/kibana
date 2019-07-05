/* eslint-disable */

const $loading = $('#loadingDemo');
const $loaded = $('#loadedDemo');
let isLoading = true;

$loaded.hide();

setInterval(() => {
  if (isLoading) {
    isLoading = false;
    $loading.hide();
    $loaded.show();
  } else {
    isLoading = true;
    $loading.show();
    $loaded.hide();
  }
}, 2000);
