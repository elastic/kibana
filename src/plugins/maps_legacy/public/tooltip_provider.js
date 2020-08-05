/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
