/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';

export interface ProjectTimeQuery {
  bool: {
    filter: Array<
      | {
          term: {
            ProjectID: string;
          };
        }
      | {
          range: {
            '@timestamp': {
              gte: string;
              lt: string;
              format: string;
              boost: number;
            };
          };
        }
    >;
  };
}

export function newProjectTimeQuery(
  projectID: string,
  timeFrom: string,
  timeTo: string
): ProjectTimeQuery {
  return {
    bool: {
      filter: [
        {
          term: {
            ProjectID: projectID,
          },
        },
        {
          range: {
            '@timestamp': {
              gte: timeFrom,
              lt: timeTo,
              format: 'epoch_second',
              boost: 1.0,
            },
          },
        },
      ],
    },
  } as ProjectTimeQuery;
}

export function autoHistogramSumCountOnGroupByField(
  searchField: string,
  topNItems: number
): AggregationsAggregationContainer {
  return {
    auto_date_histogram: {
      field: '@timestamp',
      buckets: 50,
    },
    aggs: {
      group_by: {
        terms: {
          field: searchField,
          // We remove the ordering since we will rely directly on the natural
          // ordering of Elasticsearch: by default this will be the descending count
          // of matched documents. This is not equal to the ordering by sum of Count field,
          // but it's a good-enough approximation given the distribution of Count.
          size: topNItems,
        },
        aggs: {
          count: {
            sum: {
              field: 'Count',
            },
          },
        },
      },
    },
  };
}

function getExeFileName(obj: any) {
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

function checkIfStringHasParentheses(s: string) {
  return /\(|\)/.test(s);
}

function getFunctionName(obj: any) {
  return obj.FunctionName !== '' && !checkIfStringHasParentheses(obj.FunctionName)
    ? `${obj.FunctionName}()`
    : obj.FunctionName;
}

function getBlockName(obj: any) {
  if (obj.FunctionName !== '') {
    const sourceFileName = obj.SourceFilename;
    const sourceURL = sourceFileName ? sourceFileName.split('/').pop() : '';
    return `${getExeFileName(obj)}: ${getFunctionName(obj)} in ${sourceURL}#${obj.SourceLine}`;
  }
  return getExeFileName(obj);
}

const compareFlamechartSample = function (a: any, b: any) {
  return b.Samples - a.Samples;
};

const sortFlamechart = function (data: any) {
  data.Callees.sort(compareFlamechartSample);
  return data;
};

const parseFlamechart = function (data: any) {
  const parsedData = sortFlamechart(data);
  parsedData.Callees = data.Callees.map(parseFlamechart);
  return parsedData;
};

function extendFlameGraph(node: any, depth: any) {
  node.id = getBlockName(node);
  node.value = node.Samples;
  node.depth = depth;

  for (const callee of node.Callees) {
    extendFlameGraph(callee, depth + 1);
  }
}

function flattenTree(root: any, depth: any) {
  if (root.Callees.length === 0) {
    return [
      {
        id: root.id,
        value: root.value,
        depth: root.depth,
        pathFromRoot: {
          [depth]: root.id,
        },
      },
    ];
  }

  const children = root.Callees.flatMap((child: any) => flattenTree(child, depth + 1));

  children.forEach((child: any) => {
    child.pathFromRoot[depth] = root.id;
  });

  return children;
}

export function mapFlamechart(src: any) {
  src.ExeFileName = 'root';

  const root = parseFlamechart(src);

  extendFlameGraph(root, 0);

  const newRoot = flattenTree(root, 0);

  return {
    leaves: newRoot,
  };
}
