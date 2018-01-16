export const canAppendWildcard = (keyboardEvent) => {
  const {
    key,
    metaKey,
    ctrlKey,
    altKey,
    data,
  } = keyboardEvent;

  const keyPressed = key || data;

  // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/keyCode
  // is not recommended so we need to rely on `key` but browser support
  // is still spotty (https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key)
  // so just bail if it's not supported
  if (!keyPressed) {
    return false;
  }

  // If the user is holding down ctrl/cmd, they are performing some shortcut
  // and do not interpret literally
  if (metaKey || ctrlKey || altKey) {
    return false;
  }

  // If it's not a letter, number or is something longer, reject it
  if (!/[a-z0-9]/i.test(keyPressed) || keyPressed.length !== 1) {
    return false;
  }

  return true;
};
