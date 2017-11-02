const utils = {};

// parse custom char_filter/filter
utils.parseCustom = (scope, target, type) => {
  if (typeof target === 'string' && target.trim().startsWith('{')) {
    try {
      const tmpJson = JSON.parse(target);
      if (tmpJson !== null && typeof tmpJson === 'object') {
        return tmpJson;
      } else {
        scope.analyzerError = type + ' has wrong custom ' + type;
        return -1;
      }
    } catch (e) {
      scope.analyzerError = e.message;
      return -1;
    }
  } else if(typeof target === 'string') {
    return target.trim();
  } else {
    scope.analyzerError = 'unexpected type in ' + type;
    return -1;
  }
};

// compare and swap tokenStreamLength
utils.getLength = (current, tokenArray) => {
  let length = current;
  if (Array.isArray(tokenArray)) {
    // FIXME must consider the situation if positionIncrements != 1
    if (tokenArray.length > 0 && tokenArray[tokenArray.length - 1].position >= current) {
      length = tokenArray[tokenArray.length - 1].position + 1;
    }
  }
  return length;
};

// count tokenstream length
utils.countTokenStreamLength = (scope, detail) => {
  let tokenStreamLength = 0;
  if (detail.tokenizer) {
    tokenStreamLength = utils.getLength(tokenStreamLength, detail.tokenizer.tokens);
  } else if (detail.analyzer) {
    tokenStreamLength = utils.getLength(tokenStreamLength, detail.analyzer.tokens);
  }
  if (detail.tokenfilters) {
    detail.tokenfilters.forEach((filter) => {
      tokenStreamLength = utils.getLength(tokenStreamLength, filter.tokens);
    });
  }
  scope.tokenIndicesArray = [];
  for (let i = 0; i < tokenStreamLength; i++) {
    scope.tokenIndicesArray.push(i);
  }
};

utils.initialItems = (size) => {
  const items = [];
  for (let i = 0; i < size; i++) {
    items.push({ 'item': '', 'id': i });
  }
  return items;
};

// add an item(char_filter/filter/analyzer) to target array
utils.addItem = (targetArray) => {
  targetArray.push({ 'item': '', 'id': targetArray.length });
};

// remove an item(char_filter/filter/analyzer) to
utils.removeItem = (index, targetArray) => {
  targetArray.splice(index, 1);
};

export default utils;
