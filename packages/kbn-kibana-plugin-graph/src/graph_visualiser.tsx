/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { EuiFilePicker, EuiPanel, EuiTitle } from '@elastic/eui';
import cytoscape from 'cytoscape';
import { Cytoscape } from './cytoscape';

export function GraphVisualiser() {
  const [json, setJson] = useState<cytoscape.ElementsDefinition | null>(null);
  const [complete, setComplete] = useState(false);

  return (
    <EuiPanel>
      <EuiTitle>
        <h2>Kibana Plugin Graph</h2>
      </EuiTitle>

      <EuiFilePicker
        compressed
        onChange={async (fileList) => {
          const file = fileList?.item(0);

          if (file) {
            const contents = await file.text();
            const jsonGraph = JSON.parse(contents);

            if (jsonGraph.nodes && jsonGraph.edges) {
              setJson(jsonGraph as cytoscape.ElementsDefinition);
              setComplete(true);
            }
          }
        }}
      />
      {complete ? 'Complete' : 'Not complete'}
      {json ? <Cytoscape elements={json} height={500} /> : null}
    </EuiPanel>
  );
}
