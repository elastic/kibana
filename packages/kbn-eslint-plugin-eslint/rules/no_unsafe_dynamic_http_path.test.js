/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const dedent = require('dedent');
const rule = require('./no_unsafe_dynamic_http_path');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2018,
    ecmaFeatures: {
      jsx: true,
    },
  },
});

const WARN_MSG =
  'Dangerous use of dynamic http path. Use buildPath() from `@kbn/core-http-browser` or encodeURIComponent() so path params are encoded safely.';

ruleTester.run('@kbn/eslint/no_unsafe_dynamic_http_path', rule, {
  valid: [
    {
      code: dedent`
        http.delete('/api/dashboards/123');
      `,
    },
    {
      code: dedent`
        http.delete(buildPath('/api/dashboards/{id}', { id }));
      `,
    },
    {
      code: ['const path = `/api/dashboards/${id}`;', 'http.delete(path);'].join('\n'),
    },
    {
      code: 'http.post(`/api/dashboards/${encodeURIComponent(id)}`);',
    },
    {
      code: dedent`
        client.delete(\`/api/dashboards/\${id}\`);
      `,
    },
    {
      code: 'http.delete(`/api/dashboards/${encodeURIComponent(id)}`);',
    },
    {
      code: dedent`
        http.delete('/api/dashboards/' + encodeURIComponent(id));
      `,
    },
    {
      code: dedent`
        http.get({ path: buildPath('/api/dashboards/{id}', { id }) });
      `,
    },
    {
      code: dedent`
        http.put({ path: '/api/dashboards/' + encodeURIComponent(id) });
      `,
    },
    {
      code: dedent`
        http.patch({ 'path': '/api/dashboards/' + encodeURIComponent(id), body });
      `,
    },
    {
      code: dedent`
        http.fetch(buildPath('/api/dashboards/{id}', { id }), { method: 'DELETE' });
      `,
    },
    {
      code: dedent`
        http.fetch({ path: buildPath('/api/dashboards/{id}', { id }), method: 'POST', body });
      `,
    },
    {
      code: dedent`
        http.fetch({ body: '/api/dashboards/' + id, method: 'POST' });
      `,
    },
    {
      code: [
        'return await this.http.delete<void>(',
        '  `${INTERNAL_ROUTES.JOBS.DELETE_PREFIX}/${encodeURIComponent(jobId)}`',
        ');',
      ].join('\n'),
    },
    {
      code: dedent`
        return await this.http.delete<void>(
          INTERNAL_ROUTES.JOBS.DELETE_PREFIX + '/' + encodeURIComponent(jobId)
        );
      `,
    },
    {
      code: 'http.get({ path: `${MY_CONSTANT.path}/${encodeURIComponent(id)}` });',
    },
  ],
  invalid: [
    {
      code: 'http.delete(`/api/dashboards/${id}`);',
      errors: [{ line: 1, message: WARN_MSG }],
    },
    {
      code: 'this.http.get(`/api/dashboards/${id}`);',
      errors: [{ line: 1, message: WARN_MSG }],
    },
    {
      code: dedent`
        Legacy.shims.http.post('/api/dashboards/' + id);
      `,
      errors: [{ line: 1, message: WARN_MSG }],
    },
    {
      code: dedent`
        getServices().http.put({ path: basePath + '/' + id });
      `,
      errors: [{ line: 1, message: WARN_MSG }],
    },
    {
      code: "http.options(condition ? `/api/dashboards/${id}` : '/api/dashboards/default');",
      errors: [{ line: 1, message: WARN_MSG }],
    },
    {
      code: "http.head({ path: condition ? `/api/dashboards/${id}` : '/api/dashboards/default' });",
      errors: [{ line: 1, message: WARN_MSG }],
    },
    {
      code: dedent`
        http.patch({ 'path': '/api/dashboards/' + id, body });
      `,
      errors: [{ line: 1, message: WARN_MSG }],
    },
    {
      code: dedent`
        http.fetch('/api/dashboards/' + id, { method: 'DELETE' });
      `,
      errors: [{ line: 1, message: WARN_MSG }],
    },
    {
      code: "this.http.fetch({ path: `/api/dashboards/${id}`, method: 'POST', body });",
      errors: [{ line: 1, message: WARN_MSG }],
    },
    {
      code: 'this.http.delete(`${INTERNAL_ROUTES.JOBS.DELETE_PREFIX}/${jobId}`);',
      errors: [{ line: 1, message: WARN_MSG }],
    },
    {
      code: dedent`
        this.http.delete(INTERNAL_ROUTES.JOBS.DELETE_PREFIX + '/' + jobId);
      `,
      errors: [{ line: 1, message: WARN_MSG }],
    },
    {
      code: 'this.http.get(`${prefix}/${encodeURIComponent(id)}`);',
      errors: [{ line: 1, message: WARN_MSG }],
    },
    {
      code: 'this.http.get(`${MY_CONSTANT.path}/${MY_CONSTANT.path2}`);',
      errors: [{ line: 1, message: WARN_MSG }],
    },
  ],
});
