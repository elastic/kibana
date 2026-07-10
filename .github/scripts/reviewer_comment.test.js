/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const assert = require('node:assert/strict');
const test = require('node:test');

const { buildWorkflowDispatchInputs } = require('./reviewer_comment');

test('propagates the validated follow-up comment type', () => {
  assert.deepEqual(
    buildWorkflowDispatchInputs({
      reviewerId: 'claude',
      pullNumber: 123,
      commentId: 456,
      commentType: 'pull_request_review_comment',
    }),
    {
      pr_number: '123',
      comment_id: '456',
      comment_type: 'pull_request_review_comment',
    }
  );
});

test('does not send Claude-only inputs to other reviewer workflows', () => {
  assert.deepEqual(
    buildWorkflowDispatchInputs({
      reviewerId: 'codex',
      pullNumber: 123,
      commentId: 456,
      commentType: 'issue_comment',
    }),
    {
      pr_number: '123',
      comment_id: '456',
    }
  );
});
