/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Snapshot serializer for Enzyme wrappers.
 *
 * Adapted from enzyme-to-json 3.6.2 (MIT), Copyright (c) 2016 Adrien Antoine,
 * so existing Enzyme snapshots stay stable until those tests migrate to React
 * Testing Library. New tests should use RTL rather than Enzyme snapshots.
 *
 * This must run AFTER enzyme_emotion_serializer.js (Jest tries serializers last-first).
 */

const ShallowWrapper = require('enzyme/build/ShallowWrapper');
const ReactWrapper = require('enzyme/build/ReactWrapper');
const { typeName } = require('enzyme/build/Debug');
const { childrenOfNode, propsOfNode } = require('enzyme/build/RSTTraversal');

const SHALLOW_WRAPPER_NAME = (ShallowWrapper.default || ShallowWrapper).name;
const REACT_WRAPPER_NAME = (ReactWrapper.default || ReactWrapper).name;
const REACT_TEST_JSON = Symbol.for('react.test.json');
const REACT_LAZY = Symbol.for('react.lazy');
const REACT_MEMO = Symbol.for('react.memo');
const REACT_SUSPENSE = Symbol.for('react.suspense');

function isShallowWrapper(wrapper) {
  return (
    wrapper != null &&
    wrapper.constructor != null &&
    wrapper.constructor.name === SHALLOW_WRAPPER_NAME
  );
}

function isReactWrapper(wrapper) {
  return (
    wrapper != null &&
    wrapper.constructor != null &&
    wrapper.constructor.name === REACT_WRAPPER_NAME
  );
}

function isCheerioWrapper(wrapper) {
  return wrapper != null && wrapper.cheerio != null;
}

function isEnzymeWrapper(wrapper) {
  return isShallowWrapper(wrapper) || isReactWrapper(wrapper) || isCheerioWrapper(wrapper);
}

function compact(array) {
  return array.filter((item) => item != null && item !== '');
}

function extractTypeName(node) {
  const name = typeName(node);

  if (name && name.$$typeof === REACT_LAZY) {
    return 'React.Lazy';
  }
  if (name && name.$$typeof === REACT_MEMO) {
    return 'React.Memo';
  }
  if (name === REACT_SUSPENSE) {
    return 'React.Suspense';
  }

  return name;
}

function getProps(node) {
  const props = {};
  for (const [key, val] of Object.entries({ ...propsOfNode(node) })) {
    if (key === 'children' || val === undefined) {
      continue;
    }
    props[key] = val;
  }
  if (node.key != null) {
    props.key = node.key;
  }
  return props;
}

function shallowNodeToJson(node) {
  if (typeof node === 'string' || typeof node === 'number') {
    return node;
  }

  if (node == null || node === false) {
    return '';
  }

  const json = {
    type: extractTypeName(node),
    props: getProps(node),
    children: compact(childrenOfNode(node).map((child) => shallowNodeToJson(child))),
    $$typeof: REACT_TEST_JSON,
  };

  if (json.children.length === 0) {
    json.children = null;
  }

  if (json.type == null) {
    return undefined;
  }

  return json;
}

function mountNodeToJson(node) {
  if (typeof node === 'string' || typeof node === 'number') {
    return node;
  }

  if (node == null || node === false) {
    return '';
  }

  if (Array.isArray(node)) {
    if (node.length === 1) {
      return mountNodeToJson(node[0]);
    }
    return node.map((child) => mountNodeToJson(child));
  }

  const children = compact(childrenOfNode(node).map((child) => mountNodeToJson(child)));

  return {
    type: typeName(node),
    props: getProps(node),
    children: children.length > 0 ? children : null,
    $$typeof: REACT_TEST_JSON,
  };
}

function enzymeWrapperToJson(wrapper, nodeToJson) {
  if (wrapper == null || wrapper.length === 0) {
    return null;
  }

  if (wrapper.length > 1 && typeof wrapper.getNodesInternal === 'function') {
    return wrapper.getNodesInternal().map((node) => nodeToJson(node));
  }

  if (typeof wrapper.getNodeInternal === 'function') {
    return nodeToJson(wrapper.getNodeInternal());
  }

  return null;
}

function renderChildToJson(child) {
  if (child == null) {
    return null;
  }

  if (child.type === 'tag' || child.type === 'script') {
    return {
      type: child.name,
      props: child.attribs,
      children: compact((child.children || []).map((c) => renderChildToJson(c))),
      $$typeof: REACT_TEST_JSON,
    };
  }

  if (child.type === 'text') {
    return child.data;
  }

  return null;
}

function cheerioToJson(wrapper) {
  if (wrapper == null || wrapper.length === 0) {
    return null;
  }

  if (wrapper.length > 1) {
    return Array.from({ length: wrapper.length }, (_, i) => renderChildToJson(wrapper[i]));
  }

  return renderChildToJson(wrapper[0]);
}

function toJson(wrapper) {
  if (isShallowWrapper(wrapper)) {
    return enzymeWrapperToJson(wrapper, shallowNodeToJson);
  }
  if (isReactWrapper(wrapper)) {
    return enzymeWrapperToJson(wrapper, mountNodeToJson);
  }
  if (isCheerioWrapper(wrapper)) {
    return cheerioToJson(wrapper);
  }
  return null;
}

module.exports = {
  test(wrapper) {
    return isEnzymeWrapper(wrapper);
  },
  print(wrapper, serialize) {
    return serialize(toJson(wrapper));
  },
};
