/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useLayoutEffect, useRef, useState } from 'react';
import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiTitle,
} from '@elastic/eui';
import cytoscape from 'cytoscape';
import { Cytoscape } from './cytoscape';
import kbnGraph from '../../../kbn-dependency-graph.json';
import { OptionsPanel } from './options_panel';

export function GraphVisualiser() {
  const [loading, setLoading] = useState(true);
  const [selectedNodes, setSelectedNodes] = useState<
    Array<EuiComboBoxOptionOption<string>> | undefined
  >([
    {
      label: 'observabilityAIAssistant',
      value: 'observabilityAIAssistant',
    },
  ]);

  const ref = useRef<HTMLDivElement | null>(null);
  const [container, setContainerDimensions] = useState<{ width: number; height: number } | null>(
    null
  );

  const [json, setJson] = useState<cytoscape.ElementsDefinition | null>(
    selectedNodes?.length ? filterNodes(selectedNodes) : kbnGraph
  );

  const handleResize = () => {
    if (ref.current) {
      setContainerDimensions({ width: ref.current.clientWidth, height: ref.current.clientHeight });
    }
  };

  useLayoutEffect(() => {
    handleResize();

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const [cytoscapeOptions, setCytoscapeOptions] = useState<cytoscape.LayoutOptions>({
    // general layout
    // name: 'cose',
    animate: true,
    padding: 0,
    componentSpacing: 50,
    avoidOverlap: true,
    fit: true,
    ready: () => {
      setLoading(false);
    },

    // // Number of iterations between consecutive screen positions update
    // // (0 -> only updated on the end)
    // refresh: 20,
    // // Randomize the initial positions of the nodes (true) or use existing positions (false)
    // randomize: false,
    // // Extra spacing between components in non-compound graphs
    // componentSpacing: 40,
    // // Node repulsion (non overlapping) multiplier
    // nodeRepulsion: () => 200000,
    // // Node repulsion (overlapping) multiplier
    // nodeOverlap: 1.2,
    // // Ideal edge (non nested) length
    // idealEdgeLength: () => 100,
    // // Divisor to compute edge forces
    // edgeElasticity: () => 2,
    // // Nesting factor (multiplier) to compute ideal edge length for nested edges
    // nestingFactor: 2,
    // // Gravity force (constant)
    // gravity: 1,
    // // Maximum number of iterations to perform
    // numIter: 3,
    // // Initial temperature (maximum node displacement)
    // initialTemp: 40,
    // // Cooling factor (how the temperature is reduced between consecutive iterations
    // coolingFactor: 4,
    // // Lower temperature threshold (below this point the layout will end)
    // minTemp: 20,
    // // Pass a reference to weaver to use threads for calculations
    // weaver: false,

    // dagre layout options
    name: 'dagre',
    nodeSep: 100, // the separation between adjacent nodes in the same rank
    edgeSep: 20, // the separation between adjacent edges in the same rank
    rankSep: 200, // the separation between each rank in the layout
    rankDir: 'BT', // 'TB' for top to bottom flow, 'LR' for left to right,
    align: 'UL', // alignment for rank nodes. Can be 'UL', 'UR', 'DL', or 'DR', where U = up, D = down, L = left, and R = right
    // acyclicer: 'greedy', // If set to 'greedy', uses a greedy heuristic for finding a feedback arc set for a graph.
    // A feedback arc set is a set of edges that can be removed to make a graph acyclic.
    ranker: 'tight-tree', // Type of algorithm to assign a rank to each node in the input graph. Possible values: 'network-simplex', 'tight-tree' or 'longest-path'
    minLen(edge) {
      return 1;
    }, // number of ranks to keep between the source and target of the edge
    edgeWeight(edge) {
      return 1;
    }, // higher weight edges are generally made shorter and straighter than lower weight edges})
  });

  const options = kbnGraph?.nodes.map((el) => ({
    label: el.data.id || '',
    value: el.data.id || '',
  }));

  return (
    <EuiPanel style={{ height: '100%' }}>
      <EuiFlexGroup direction="column" style={{ height: '100%' }}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" justifyContent="spaceAround">
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiTitle>
                    <h2>Kibana Plugin Graph</h2>
                  </EuiTitle>
                </EuiFlexItem>

                <EuiFlexItem>
                  <EuiComboBox<string>
                    aria-label="Select a plugin"
                    placeholder="Select a plugin"
                    options={options}
                    selectedOptions={selectedNodes}
                    fullWidth
                    onChange={(selectedOptions) => {
                      setSelectedNodes(selectedOptions);

                      if (selectedOptions.length === 0) {
                        setLoading(true);
                        setJson(kbnGraph);
                        return;
                      }

                      const filtered = filterNodes(selectedOptions);

                      setJson(filtered);
                    }}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false} style={{ alignItems: 'flex-end' }}>
              {loading ? (
                <EuiLoadingSpinner />
              ) : (
                <EuiFilePicker
                  style={{ marginLeft: 'auto' }}
                  compressed
                  display="default"
                  initialPromptText={
                    json ? 'graph loaded' : 'Select a JSON file with "nodes" and "edges" keys'
                  }
                  onChange={async (fileList) => {
                    const file = fileList?.item(0);

                    if (file) {
                      const contents = await file.text();
                      const jsonGraph = JSON.parse(contents);

                      if (jsonGraph.nodes && jsonGraph.edges) {
                        setJson(jsonGraph as cytoscape.ElementsDefinition);
                      }
                    }
                  }}
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="s" />

          <EuiPanel hasBorder hasShadow={false}>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiStat
                  description="Plugins"
                  title={json?.nodes.filter((el) => el.data.type === 'plugin').length}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiStat description="Edges" title={json?.edges.length} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>

        <OptionsPanel
          containerHeight={container?.height}
          cytoscapeOptions={cytoscapeOptions}
          onSetCytoscapeOptions={setCytoscapeOptions}
        />

        <EuiFlexItem style={{ minHeight: 0 }}>
          <EuiSpacer size="l" />

          <EuiFlexGroup style={{ minHeight: 0 }}>
            <EuiFlexItem>
              <div
                style={{ display: 'flex', height: '100%', width: '100%', flexGrow: 0 }}
                ref={ref}
              >
                {json && container ? (
                  <Cytoscape
                    elements={json}
                    height={container.height}
                    width={container.width}
                    layoutOptions={cytoscapeOptions}
                    onReady={() => setLoading(false)}
                  />
                ) : null}
              </div>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

const filterNodes = (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
  const selectedNodes = selectedOptions?.map((el) => el.label);

  const edges =
    kbnGraph?.edges.filter(
      (edge) =>
        selectedNodes?.includes(edge.data.target) || selectedNodes?.includes(edge.data.source)
    ) || [];

  const edgeNodes = edges?.reduce((acc, edge) => {
    acc.push(edge.data.source);
    acc.push(edge.data.target);

    return acc;
  }, [] as string[]);

  const filtered = {
    nodes: kbnGraph?.nodes.filter((node) => edgeNodes?.includes(node.data.id || '')) || [],
    edges,
  };

  return filtered;
};
