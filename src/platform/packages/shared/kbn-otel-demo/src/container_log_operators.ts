/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * filelog operators that turn a line of a `/var/log/pods/...` file into a log record.
 *
 * The `container` operator detects the runtime's format (Docker JSON, or CRI as written by
 * containerd and CRI-O, which minikube uses by default), joins CRI partial lines, moves the
 * message to `body` and the stream to `log.iostream`, and sets the k8s resource attributes from
 * the file path. Multiline entries such as stack traces are then joined on `body`: a line that
 * starts with whitespace continues the previous one.
 */
export const CONTAINER_LOG_OPERATORS: ReadonlyArray<Record<string, unknown>> = [
  {
    type: 'container',
    id: 'container-parser',
    add_metadata_from_filepath: true,
  },
  {
    type: 'recombine',
    id: 'multiline',
    combine_field: 'body',
    is_first_entry: 'body matches "^[^[:space:]]"',
    combine_with: '\n',
    max_log_size: 102400,
    source_identifier: 'attributes["log.file.path"]',
  },
];
