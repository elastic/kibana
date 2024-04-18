/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { React, ReactDOM } from 'https://unpkg.com/es-react';
import htm from 'https://unpkg.com/htm?module';
import Cytoscape from 'https://unpkg.com/cytoscape@3.28.1/dist/cytoscape.min.js?module';
import ReactCytoscape from 'https://unpkg.com/@imtf/react-cytoscapejs?module';

const html = htm.bind(React.createElement);

ReactDOM.render(
  html`
    <${React.Suspense} fallback=${html`<div>loading...</div>`}>
        <div style={{ height: 800 }} ref={ref}>
        hello!
          <${ReactCytoscape} />
        </div>
    <//>
  `,
  document.body
);

/*
            elements={data.elements}
            height={heightWithPadding}
            serviceName={serviceName}
            style={getCytoscapeDivStyle(theme, status)}
*/
