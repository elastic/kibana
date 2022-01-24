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

export function mapKibanaFlameChart(src) {
  src.ExeFileName = 'root';

  return {
    facts: [
      {
        id: 'pf-collection-agent: runtime.releaseSudog() in runtime2.go#282',
        value: 1,
        depth: 19,
        layers: {
          '0': 'root',
          '1': 'pf-collection-agent: runtime.goexit() in asm_amd64.s#1581',
          '2': 'pf-collection-agent: github.com/optimyze/prodfiler/pf-storage-backend/storagebackend/storagebackendv1.(*ScyllaExecutor).Start.func1 in scyllaexecutor.go#102',
          '3': 'pf-collection-agent: github.com/optimyze/prodfiler/pf-storage-backend/storagebackend/storagebackendv1.(*ScyllaExecutor).executeQueryAndReadResults in scyllaexecutor.go#158',
          '4': 'pf-collection-agent: github.com/gocql/gocql.(*Query).Iter in session.go#1246',
          '5': 'pf-collection-agent: github.com/gocql/gocql.(*Session).executeQuery in session.go#463',
          '6': 'pf-collection-agent: github.com/gocql/gocql.(*queryExecutor).executeQuery in query_executor.go#66',
          '7': 'pf-collection-agent: github.com/gocql/gocql.(*queryExecutor).do in query_executor.go#127',
          '8': 'pf-collection-agent: github.com/gocql/gocql.(*queryExecutor).attemptQuery in query_executor.go#32',
          '9': 'pf-collection-agent: github.com/gocql/gocql.(*Query).execute in session.go#1044',
          '10': 'pf-collection-agent: github.com/gocql/gocql.(*Conn).executeQuery in conn.go#1129',
          '11': 'pf-collection-agent: github.com/gocql/gocql.(*Conn).exec in conn.go#916',
          '12': 'pf-collection-agent: github.com/gocql/gocql.(*writeExecuteFrame).writeFrame in frame.go#1618',
          '13': 'pf-collection-agent: github.com/gocql/gocql.(*framer).writeExecuteFrame in frame.go#1643',
          '14': 'pf-collection-agent: github.com/gocql/gocql.(*framer).finishWrite in frame.go#788',
          '15': 'pf-collection-agent: github.com/gocql/gocql.(*Conn).Write in conn.go#319',
          '16': 'pf-collection-agent: github.com/gocql/gocql.(*writeCoalescer).Write in conn.go#829',
          '17': 'pf-collection-agent: sync.(*Cond).Wait in cond.go#83',
          '18': 'pf-collection-agent: sync.runtime_notifyListWait() in sema.go#498',
          '19': 'pf-collection-agent: runtime.releaseSudog() in runtime2.go#282',
        },
      },
    ],
  };
}
