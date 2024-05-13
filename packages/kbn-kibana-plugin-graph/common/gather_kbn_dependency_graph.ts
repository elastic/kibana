/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs';
import { Jsonc } from '@kbn/repo-packages';
import FastGlob from 'fast-glob';

interface KibanaJsonC {
  type: string;
  id: string; // the @kbn notation, used for both plugins and bundles
  plugin?: {
    id: string; // the plugin id
    requiredPlugins?: string[];
    optionalPlugins?: string[];
    requiredBundles?: string[];
  };
}

export async function generateGraph() {
  try {
    // Use globby to search for the filename within the specified directory and its subdirectories
    const files = await FastGlob(
      [
        'examples/**/kibana.jsonc',
        'packages/**/kibana.jsonc',
        'x-pack/**/kibana.jsonc',
        'src/**/kibana.jsonc',
      ],
      { unique: true }
    );

    const elements: cytoscape.ElementsDefinition = {
      nodes: [],
      edges: [],
    };

    for (const file of files) {
      const contents = fs.readFileSync(file, 'utf8');

      const json = (await Jsonc.parse(contents)) as KibanaJsonC;

      if (json.plugin?.id) {
        elements.nodes.push({ data: { id: json.plugin.id, type: 'plugin' } });
      }

      if (json.plugin?.requiredPlugins) {
        for (const requiredPlugin of json.plugin.requiredPlugins) {
          elements.edges.push({
            data: {
              id: `${json.plugin.id}-${requiredPlugin}`,
              source: json.plugin.id,
              target: requiredPlugin,
              type: 'requiredPlugin',
            },
          });
        }
      }
      if (json.plugin?.optionalPlugins) {
        for (const optionalPlugin of json.plugin.optionalPlugins) {
          if (elements.nodes.find((node) => node.data.id === optionalPlugin)) {
            // apparently elements in 'optionalPlugins' are not checked; so it could be they don't exist
            elements.edges.push({
              data: {
                id: `${json.plugin.id}-${optionalPlugin}`,
                source: json.plugin.id,
                target: optionalPlugin,
                type: 'optionalPlugin',
              },
            });
          }
        }
      }

      if (json.plugin?.requiredBundles) {
        for (const requiredBundle of json.plugin.requiredBundles) {
          elements.edges.push({
            data: {
              id: `${json.plugin.id}-${requiredBundle}`,
              source: json.plugin.id,
              target: requiredBundle,
              type: 'bundle',
            },
          });
        }
      }
    }

    fs.writeFileSync('kbn-dependency-graph.json', JSON.stringify(elements, null, 2));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error occurred while searching for files:', error);
    return [];
  }
}
