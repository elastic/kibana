/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-unused-vars */

/* eslint-disable no-undef */

// Test cases for UnsafeDynamicHttpPath.ql
// Detects dynamic strings flowing into a browser `http.*` request path without
// buildPath()/encodeURIComponent().
//
// CodeQL Test Annotations:
// - `// $ Alert` marks the sink line (the http call) that SHOULD be reported.
// - Lines without `// $ Alert` should NOT be reported.

import { makeUnsafeDeletePath, makeSafeDeletePath } from './__fixtures__/paths';

// =============================================================================
// BAD: inline dynamic path at the call site (also caught by the ESLint rule)
// =============================================================================

// BAD: template literal with an unencoded interpolation
http.delete(`/api/dashboards/${id}`); // $ Alert

// BAD: string concatenation
http.post('/api/dashboards/' + id); // $ Alert

// BAD: conditional whose dynamic branch is unsafe
http.options(condition ? `/api/dashboards/${id}` : '/api/dashboards/default'); // $ Alert

// BAD: object overload `{ path }`
http.fetch({ path: `/api/dashboards/${id}`, method: 'POST', body }); // $ Alert

// BAD: constant prefix but unencoded dynamic suffix
http.get(`${prefix}/${id}`); // $ Alert
http.delete(INTERNAL_ROUTES.JOBS.DELETE_PREFIX + '/' + jobId); // $ Alert

// BAD: various http-like receivers
Legacy.shims.http.post('/api/dashboards/' + id); // $ Alert
getServices().http.put({ path: basePath + '/' + id }); // $ Alert

class DashboardClientBad {
  // BAD: `this.http` receiver
  remove(id) {
    return this.http.delete(`/api/dashboards/${id}`); // $ Alert
  }
}

// =============================================================================
// BAD: data-flow cases the ESLint rule CANNOT see (the reason for this query)
// =============================================================================

// BAD: path built into a local variable, then passed to http.delete
const pathViaVar = `/api/dashboards/${id}`;
http.delete(pathViaVar); // $ Alert

// BAD: path returned from a local helper function (interprocedural)
function buildDeletePath(id) {
  return `/api/dashboards/${id}`;
}
http.delete(buildDeletePath(id)); // $ Alert

// BAD: path built by a helper in ANOTHER file (cross-file)
http.delete(makeUnsafeDeletePath(id)); // $ Alert

// =============================================================================
// GOOD: should NOT be reported
// =============================================================================

// GOOD: fully static path
http.delete('/api/dashboards/123');

// GOOD: buildPath() encodes the params
http.delete(buildPath('/api/dashboards/{id}', { id }));
http.get({ path: buildPath('/api/dashboards/{id}', { id }) });

// GOOD: encodeURIComponent on the dynamic segment
http.post(`/api/dashboards/${encodeURIComponent(id)}`);
http.delete('/api/dashboards/' + encodeURIComponent(id));

// GOOD: constant-only segments (ALL_CAPS refs)
http.get(`${INTERNAL_ROUTES.BASE}/status`);

// GOOD: non-http receiver is out of scope
client.delete(`/api/dashboards/${id}`);

// GOOD: safe value held in a variable (buildPath result)
const safePath = buildPath('/api/dashboards/{id}', { id });
http.delete(safePath);

// GOOD: cross-file helper that encodes before returning
http.delete(makeSafeDeletePath(id));
