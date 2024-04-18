/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs';
import globby from 'globby';
import { REPO_ROOT } from '@kbn/repo-info';
import { Jsonc } from '@kbn/repo-packages';
import Fsp from 'fs/promises';

interface KibanaJsonC {
  plugin?: {
    id: string;
    requiredPlugins?: string[];
    optionalPlugins?: string[];
    requiredBundles?: string[];
  };
}

interface Graph {
  nodes: Array<{ data: { id: string } }>;
  edges: Array<{ data: { id: string; source: string; target: string } }>;
}

export async function generateGraph() {
  try {
    // Use globby to search for the filename within the specified directory and its subdirectories
    const files = await globby([`${REPO_ROOT}/**/kibana.jsonc`]);

    const elements: Graph = {
      nodes: [],
      edges: [],
    };

    for (const file of files) {
      const contents = await Fsp.readFile(file, 'utf8');

      const json = (await Jsonc.parse(contents)) as KibanaJsonC;

      if (json.plugin?.id) {
        elements.nodes.push({ data: { id: json.plugin.id } });
      }

      if (json.plugin?.requiredPlugins) {
        for (const requiredPlugin of json.plugin.requiredPlugins) {
          elements.edges.push({
            data: {
              id: `${json.plugin.id}-${requiredPlugin}`,
              source: json.plugin.id,
              target: requiredPlugin,
            },
          });
        }
      }
    }

    // const foo = await Promise.all(
    //   files.map(async (file) => {
    //     const contents = await Fsp.readFile(file, 'utf8');

    //     const json = (await Jsonc.parse(contents)) as KibanaJsonC;

    //     if (json.plugin?.id) {
    //       elements.nodes.push({ data: { id: json.plugin.id } });
    //     }

    //     if (json.plugin?.requiredPlugins) {
    //       for (const requiredPlugin of json.plugin.requiredPlugins) {
    //         elements.edges.push({
    //           data: {
    //             id: `${json.plugin.id}-${requiredPlugin}`,
    //             source: json.plugin.id,
    //             target: requiredPlugin,
    //           },
    //         });
    //       }
    //     }
    //   })
    // );

    console.log('elements', elements);

    fs.writeFileSync('kbn-dependency-graph.json', JSON.stringify(elements, null, 2));
  } catch (error) {
    console.error('Error occurred while searching for files:', error);
    return [];
  }
}

/*

cytoscape({
  container: document.getElementById('cy'),

  elements: {
    nodes: [
      {
        data: { id: 'a' }
      },

      {
        data: { id: 'b' }
      }
    ],
    edges: [
      {
        data: { id: 'ab', source: 'a', target: 'b' }
      }
    ]
  },

  layout: {
    name: 'grid',
    rows: 1
  },

  // so we can see the ids
  style: [
    {
      selector: 'node',
      style: {
        'label': 'data(id)'
      }
    }
  ]
});

*/
