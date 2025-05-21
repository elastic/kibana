/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useRef, useState, type FC } from 'react';
import { cloneDeep } from 'lodash';

import { EuiBadge } from '@elastic/eui';

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { EventBus } from '@kbn/event-bus-plugin/public';
import { getESQLResults } from '@kbn/esql-utils';
import type { DashboardCrossfilterSlice } from '@kbn/eventbus-slices';

import { getUnableToParseIframeMessage, getIframeContent } from './js_sandbox_iframe_content';

function truncateString(str: string, n: number) {
  // Check if the string length exceeds the limit
  if (str.length > n) {
    // Truncate and append "..."
    return str.slice(0, n) + '...';
  }
  // Return the original string if it's within the limit
  return str;
}

/**
 * JS Sandbox Component
 *
 * The iframe sandbox approach is the most straightforward for front-end-only
 * solutions and allows you to contain user-entered code securely.
 *
 * When allowing users to execute JavaScript, it's critical to:
 * - Limit what users can do, e.g., avoid allow-same-origin in iframes.
 * - Never eval() user-provided code directly in your main application context.
 * - Use a Content Security Policy (CSP) to limit what can be executed.
 *
 * Elements of this component:
 *
 * Sandboxed `iframe`:
 * - We use an `iframe` with `sandbox="allow-scripts"` to isolate the user’s code.
 * - The `srcdoc` attribute contains the HTML and JavaScript needed to load React,
 *   ReactDOM etc., and set up rendering.
 *
 * User Code Wrapping:
 * - The user input is required to provide a functional component.
 * - The `transpileUserCode` function evaluates the provided component code.
 * - This function uses eval() to execute user code, but it’s done within the
 *   controlled iframe to mitigate security risks.
 * - After evaluating the user code, it attempts to render a UserComponent
 *   using ReactDOM.render().
 *
 * Render Process:
 * - The UserComponent is rendered in the <div id="root"></div> element in
 *   the iframe. This ensures that the user's code and React components do not
 *   have access to the parent document.
 *
 * Security Considerations:
 * - Isolation: By using an iframe with sandbox="allow-scripts", we ensure
 *   that user code cannot access cookies, local storage, or interact with
 *   the parent application’s JavaScript context.
 * - Error Handling: Any errors during the rendering process are caught and
 *   logged to the console within the iframe. This could be extended by
 *   capturing errors and displaying them to the user in a controlled manner.
 *
 * @param param0
 * @returns
 */
export const JsSandboxComponent: FC<{
  esql: string;
  hashedJs: string;
  crossfilter: EventBus<DashboardCrossfilterSlice>;
  data: DataPublicPluginStart;
}> = ({ esql, hashedJs, crossfilter, data: dataPlugin }) => {
  const iframeID = useMemo(() => Math.random().toString(36).substring(7), []);

  const [iframeReady, setIframeReady] = useState(false);
  const [error, setError] = useState<{ errorType: string; error: Error } | null>(null);
  const [data, setData] = useState<{ data: any[]; dataCrossfilter: any[] }>();

  const filters = crossfilter.useEventBusState((state) => state.filters);

  const panelFilters = useMemo(() => {
    const pfs = cloneDeep(filters);
    delete pfs[iframeID];
    return pfs;
  }, [filters, iframeID]);

  const esqlWithFilters = useMemo(() => {
    const els = esql.split('|').map((d) => d.trim());
    Object.values(panelFilters).forEach((filter) => {
      els.splice(1, 0, filter);
    });
    return els.join('\n| ');
  }, [esql, panelFilters]);

  // reset iframe state when js changes
  useEffect(() => {
    setIframeReady(false);
    // setError(null);
  }, [hashedJs]);

  // fetch data from ES
  useEffect(() => {
    const fetchData = async () => {
      const resultFull = await getESQLResults({
        esqlQuery: esql,
        // filter,
        search: dataPlugin.search.search,
        // signal: abortController?.signal,
        // timeRange: { from: fromDate, to: toDate },
      });

      const wideFormatFull = resultFull.response.values.map((row) => {
        return row.reduce((acc, val, idx) => {
          acc[resultFull.response.columns[idx].name] = val;
          return acc;
        }, {});
      });

      const resultCrossfilter = await getESQLResults({
        esqlQuery: esqlWithFilters,
        // filter,
        search: dataPlugin.search.search,
        // signal: abortController?.signal,
        // timeRange: { from: fromDate, to: toDate },
      });

      const wideFormatCrossfilter = resultCrossfilter.response.values.map((row) => {
        return row.reduce((acc, val, idx) => {
          acc[resultCrossfilter.response.columns[idx].name] = val;
          return acc;
        }, {});
      });

      setData({ data: wideFormatFull, dataCrossfilter: wideFormatCrossfilter });
    };

    if (esql !== '') {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esqlWithFilters]);

  // Do not render iframe if user provided string doesn't start with `function(`
  // or if it contains global variables.
  const jsPassesBasicCheck = useMemo(() => {
    const notAllowed = [
      'window',
      'document',
      'localStorage',
      'sessionStorage',
      'alert',
      'postMessage',
      // used by Vega
      // 'addEventListener',
      'removeEventListener',
      'dispatchEvent',
    ];
    return hashedJs.startsWith('function(') && !notAllowed.some((d) => hashedJs.includes(d));
  }, [hashedJs]);

  // Ref to store the iframe reference
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // The transpileUserCode function evaluates the provided component code.
  // This function uses eval() to execute user code, but it’s done within
  // the controlled iframe to mitigate security risks.
  const iframeContent = useMemo(
    () =>
      jsPassesBasicCheck ? getIframeContent(iframeID, hashedJs) : getUnableToParseIframeMessage(),
    [jsPassesBasicCheck, hashedJs, iframeID]
  );

  // initial handshake with iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.source === iframeID) {
        if (event.data.type === 'iframeReady') {
          setIframeReady(true);
        } else if (event.data.type === 'error') {
          setError(event.data.payload);
        } else if (event.data.type === 'crossfilter') {
          crossfilter.actions.setCrossfilter({ id: event.data.source, filter: event.data.payload });
        }
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect to update the iframe when `data` changes
  useEffect(() => {
    if (iframeReady && data && iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'updateData', payload: JSON.stringify(data) },
        '*'
      );
    }
  }, [iframeReady, iframeID, data]);

  return (
    <>
      {jsPassesBasicCheck && error && (
        <div>
          <h2>Error: {error.errorType}</h2>
          <pre>{error.error.message}</pre>
        </div>
      )}
      {filters[iframeID] && (
        <div css={{ position: 'absolute', bottom: 0 }}>
          <EuiBadge
            iconType="cross"
            iconSide="right"
            iconOnClick={() => crossfilter.actions.setCrossfilter({ id: iframeID, filter: '' })}
            iconOnClickAriaLabel="Example of onClick event for icon within the button"
            data-test-sub="crossfilter-badge"
          >
            {truncateString(filters[iframeID], 80)}
          </EuiBadge>
        </div>
      )}
      <iframe
        title="JS Sandbox"
        ref={iframeRef}
        sandbox="allow-scripts"
        srcDoc={iframeContent}
        style={{ width: '100%', height: '100%' }}
      />
    </>
  );
};
