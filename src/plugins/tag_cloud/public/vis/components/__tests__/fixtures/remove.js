function remove(element) {
  element.data(null).remove();
  element = null;
}

function removeChildren(element) {
  element.selectAll('*').remove();
}

export { remove as default, removeChildren };
