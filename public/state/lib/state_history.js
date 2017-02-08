import { isEqual } from 'lodash';

const createHistoryState = (historyItems = []) => {
  let currentIndex = getLastIndex();

  function getLastIndex() {
    return Math.max(historyItems.length - 1, 0);
  }

  function back(amount = 1) {
    currentIndex -= amount;
    if (currentIndex <= 0) currentIndex = 0;
  }

  function forward(amount = 1) {
    currentIndex += amount;
    if (currentIndex >= historyItems.length) currentIndex = getLastIndex();
  }

  function beginning() {
    currentIndex = 0;
  }

  function end() {
    currentIndex = getLastIndex();
  }

  function push(historyItem) {
    // if nothing changed, don't store it in the history
    if (isEqual(historyItems[currentIndex], historyItem)) return;

    // flush old items if not at the end of the history
    if (currentIndex !== getLastIndex()) {
      historyItems.slice(0, currentIndex);
    }

    historyItems.push(historyItem);
    currentIndex = getLastIndex();
  }

  function reset(newHistory = []) {
    historyItems = newHistory;
  }

  return {
    beginning,
    end,
    back,
    forward,
    push,
    reset,
    get current() {
      return historyItems[currentIndex];
    },
    get length() {
      return historyItems.length;
    },
  };
};

export default {
  create: history => createHistoryState(history),
};