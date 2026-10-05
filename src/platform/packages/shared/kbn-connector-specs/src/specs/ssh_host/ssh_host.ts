/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Agent Builder catalog for the SSH Host connector.
 *
 * Execution stays in the hand-written stack connector (`connector_types/ssh_host`).
 * This spec is intentionally not exported from `all_specs`, so it is not registered
 * as a second `.ssh` action type. `getConnectorSpec` still returns it, which is what
 * puts `skill` and these sub-actions on the connector attachment.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';

const SCRIPT_MAX_LENGTH = 1048576;
const REMOTE_PATH_MAX_LENGTH = 4096;
const UPLOAD_CONTENT_MAX_LENGTH = 104857600;
const DOWNLOAD_MAX_BYTES = 1024 * 1024 * 1024;

const ExecInputSchema = z.object({
  script: z
    .string()
    .min(1)
    .max(SCRIPT_MAX_LENGTH)
    .describe('Shell script to run on the remote host. One call is one new shell.'),
});

const UploadFileInputSchema = z.object({
  remotePath: z
    .string()
    .min(1)
    .max(REMOTE_PATH_MAX_LENGTH)
    .describe('Absolute or relative path of the file to write on the remote host.'),
  content: z.string().min(1).max(UPLOAD_CONTENT_MAX_LENGTH).describe('File bytes, base64-encoded.'),
  encoding: z.literal('base64').describe('Must be the literal "base64".'),
});

const DownloadFileInputSchema = z.object({
  remotePath: z
    .string()
    .min(1)
    .max(REMOTE_PATH_MAX_LENGTH)
    .describe('Absolute or relative path of the file to read on the remote host.'),
  maxBytes: z
    .number()
    .int()
    .positive()
    .max(DOWNLOAD_MAX_BYTES)
    .optional()
    .describe('Maximum file size in bytes. Defaults to 10 MiB when omitted.'),
});

const catalogOnly = async (): Promise<never> => {
  throw new Error(
    'SSH Host actions are executed by the SSH Host connector. This spec only describes them for Agent Builder.'
  );
};

export const SshHost: ConnectorSpec = {
  metadata: {
    id: '.ssh',
    displayName: 'SSH Host',
    icon: 'consoleApp',
    description: i18n.translate('core.kibanaConnectorSpecs.sshHost.metadata.description', {
      defaultMessage: 'Run a shell script on a remote host over SSH, or upload and download a file',
    }),
    minimumLicense: 'basic',
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  actions: {
    exec: {
      isTool: true,
      scope: 'destroy',
      description:
        'Run one shell script on the remote host and wait until it exits. Returns stdout, stderr, and code. ' +
        'A non-zero code is the script exit code. code 255 is also what the SSH client returns when it cannot run the script (unreachable host, authentication, or host key); read stderr to tell those apart. ' +
        'Each call starts a new shell.',
      input: ExecInputSchema,
      handler: catalogOnly,
    },

    uploadFile: {
      isTool: true,
      scope: 'destroy',
      description:
        'Upload one file to remotePath. content is base64 and encoding must be "base64". ' +
        'Creates missing parent directories and overwrites an existing file. Throws if the transfer fails.',
      input: UploadFileInputSchema,
      handler: catalogOnly,
    },

    downloadFile: {
      isTool: true,
      scope: 'read',
      description:
        'Download one remote file and return it as base64. Optional maxBytes caps the size (default 10 MiB). ' +
        'Throws if the file is missing or larger than the cap.',
      input: DownloadFileInputSchema,
      handler: catalogOnly,
    },
  },

  skill: [
    'SSH Host connector — usage guidance for LLMs.',
    '',
    '## Which action',
    'downloadFile reads one remote file and returns it as base64. Use it to inspect a file.',
    'uploadFile writes one file. content is base64 and encoding must be the literal "base64". ' +
      'It creates missing parent directories and overwrites whatever is already at remotePath.',
    'exec runs one shell script and waits until that script exits. Use it for a short command. ' +
      'It is not a background job and it is not a persistent shell: the next call starts a new shell, ' +
      'with no saved working directory or environment.',
    '',
    '## exec result',
    'The result is { stdout, stderr, code }. A non-zero code is the script exit code, not a failed tool call. Read stderr before retrying.',
    'code 255 is what the SSH client returns when it cannot run the script: the host was unreachable, authentication failed, or the host key was rejected. ' +
      'A script can also exit 255, so read stderr before deciding which one happened.',
    "The call is rejected before connecting when the host is not on Kibana's allowed hosts list.",
    '',
    '## Workflows',
    'A workflow step of type ssh.run is what runs a command in the background and polls it. ' +
      'There is no ssh.run sub-action on this connector. Call exec only when the script should finish in this call.',
    '',
    '## Care',
    'exec and uploadFile can change the remote machine. Do not delete, overwrite, or stop anything the user did not ask for.',
  ].join('\n'),

  test: {
    enabled: false,
    handler: catalogOnly,
  },
};
