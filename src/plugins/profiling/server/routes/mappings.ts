/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

function getExeFileName(obj) {
  if (obj.ExeFileName === undefined) {
    return '';
  }
  if (obj.ExeFileName !== '') {
    return obj.ExeFileName;
  }
  switch (obj.FrameType) {
    case 0:
      return '<unsymbolized frame>';
    case 1:
      return 'Python';
    case 2:
      return 'PHP';
    case 3:
      return 'Native';
    case 4:
      return 'Kernel';
    case 5:
      return 'JVM/Hotspot';
    case 6:
      return 'Ruby';
    case 7:
      return 'Perl';
    case 8:
      return 'JavaScript';
    default:
      return '';
  }
}

function checkIfStringHasParentheses(s) {
  return /\(|\)/.test(s);
}

function getFunctionName(obj) {
  return obj.FunctionName !== '' && !checkIfStringHasParentheses(obj.FunctionName)
    ? `${obj.FunctionName}()`
    : obj.FunctionName;
}

function getBlockName(obj) {
  if (obj.FunctionName !== '') {
    const sourceFileName = obj.SourceFilename;
    const sourceURL = sourceFileName ? sourceFileName.split('/').pop() : '';
    return `${getExeFileName(obj)}: ${getFunctionName(obj)} in ${sourceURL}#${obj.SourceLine}`;
  }
  return getExeFileName(obj);
}

const sortFlamechartBySamples = function (a, b) {
  return b.Samples - a.Samples;
};

const sortFlamechart = function (data) {
  data.Callees.sort(sortFlamechartBySamples);
  return data;
};

const parseFlamechart = function (data) {
  const parsedData = sortFlamechart(data);
  parsedData.Callees = data.Callees.map(parseFlamechart);
  return parsedData;
};

function extendFlameGraph(node, depth) {
  node.id = getBlockName(node);
  node.value = node.Samples;
  node.depth = depth;

  for (const callee of node.Callees) {
    extendFlameGraph(callee, depth + 1);
  }
}

function flattenTree(root, depth) {
  if (root.Callees.length === 0) {
    return [
      {
        id: root.id,
        value: root.value,
        depth: root.depth,
        layers: {
          [depth]: root.id,
        },
      },
    ];
  }

  const children = root.Callees.flatMap((child) => flattenTree(child, depth + 1));

  children.forEach((child) => {
    child.layers[depth] = root.id;
  });

  return children;
}

export function mapFlamechart(src) {
  src.ExeFileName = 'root';

  const root = parseFlamechart(src);

  extendFlameGraph(root, 0);

  const newRoot = flattenTree(root, 0);
  [].map((node) => ({
    id: node.id,
    value: node.value,
    depth: node.depth,
    layers: node.layers,
  }));

  return {
    facts: newRoot,
  };
}
