/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import ReactDOMServer from 'react-dom/server';

function getToolTipContent(details) {
  return ReactDOMServer.renderToStaticMarkup(
    <table>
      <tbody>
        {details.map((detail, i) => (
          <tr key={i}>
            <td className="visTooltip__label">{detail.label}</td>
            <td className="visTooltip__value">{detail.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function mapTooltipProvider(element, formatter) {
  return (...args) => {
    const details = formatter(...args);
    return details && getToolTipContent(details);
  };
}
