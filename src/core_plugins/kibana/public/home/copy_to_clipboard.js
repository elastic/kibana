
function createHiddenTextElement(text) {
  const textElement = document.createElement('span');
  textElement.textContent = text;
  textElement.style.all = 'unset';
  // prevents scrolling to the end of the page
  textElement.style.position = 'fixed';
  textElement.style.top = 0;
  textElement.style.clip = 'rect(0, 0, 0, 0)';
  // used to preserve spaces and line breaks
  textElement.style.whiteSpace = 'pre';
  // do not inherit user-select (it may be `none`)
  textElement.style.webkitUserSelect = 'text';
  textElement.style.MozUserSelect = 'text';
  textElement.style.msUserSelect = 'text';
  textElement.style.userSelect = 'text';
  return textElement;
}

export function copyToClipboard(text) {
  let isCopied = true;
  const range = document.createRange();
  const selection = window.getSelection();
  const elementToBeCopied = createHiddenTextElement(text);

  document.body.appendChild(elementToBeCopied);
  range.selectNode(elementToBeCopied);
  selection.removeAllRanges();
  selection.addRange(range);

  if (!document.execCommand('copy')) {
    isCopied = false;
    console.warn('Unable to copy to clipboard.'); // eslint-disable-line no-console
  }

  if (selection) {
    if (typeof selection.removeRange === 'function') {
      selection.removeRange(range);
    } else {
      selection.removeAllRanges();
    }
  }

  document.body.removeChild(elementToBeCopied);

  return isCopied;
}
