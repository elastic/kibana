/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiCodeBlock } from '@elastic/eui';
import * as React from 'react';

const exampleSecurityPayload = {
  '@timestamp': '2020-09-22T14:34:56.82202300Z',
  agent: {
    build: {
      original:
        'version: 7.9.1, compiled: Thu Aug 27 14:50:21 2020, branch: 7.9, commit: b594beb958817dee9b9d908191ed766d483df3ea',
    },
    id: '22dd8544-bcac-46cb-b970-5e681bb99e0b',
    type: 'endpoint',
    version: '7.9.1',
  },
  Endpoint: {
    policy: {
      applied: {
        artifacts: {
          global: {
            identifiers: [
              {
                sha256: '6a546aade5563d3e8dffc1fe2d93d33edda8f9ca3e17ac3cc9ac707620cb9ecd',
                name: 'endpointpe-v4-blocklist',
              },
              {
                sha256: '04f9f87accc5d5aea433427bd1bd4ec6908f8528c78ceed26f70df7875a99385',
                name: 'endpointpe-v4-exceptionlist',
              },
              {
                sha256: '1471838597fcd79a54ea4a3ec9a9beee1a86feaedab6c98e61102559ced822a8',
                name: 'endpointpe-v4-model',
              },
              {
                sha256: '824859b0c6749cc31951d92a73bbdddfcfe9f38abfe432087934d4dab9766ce8',
                name: 'global-exceptionlist-windows',
              },
            ],
            version: '1.0.0',
          },
          user: {
            identifiers: [
              {
                sha256: 'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
                name: 'endpoint-exceptionlist-windows-v1',
              },
            ],
            version: '1.0.0',
          },
        },
      },
    },
  },
  ecs: {
    version: '1.5.0',
  },
  elastic: {
    agent: {
      id: 'b2e88aea-2671-402a-828a-957526bac315',
    },
  },
  file: {
    path: 'C:\\Windows\\Temp\\mimikatz.exe',
    size: 1263880,
    created: '2020-05-19T07:50:06.0Z',
    accessed: '2020-09-22T14:29:19.93531400Z',
    mtime: '2020-09-22T14:29:03.6040000Z',
    directory: 'C:\\Windows\\Temp',
    hash: {
      sha1: 'c9fb7f8a4c6b7b12b493a99a8dc6901d17867388',
      sha256: 'cb1553a3c88817e4cc774a5a93f9158f6785bd3815447d04b6c3f4c2c4b21ed7',
      md5: '465d5d850f54d9cde767bda90743df30',
    },
    Ext: {
      code_signature: {
        trusted: true,
        subject_name: 'Open Source Developer, Benjamin Delpy',
        exists: true,
        status: 'trusted',
      },
      malware_classification: {
        identifier: 'endpointpe-v4-model',
        score: 0.99956864118576,
        threshold: 0.71,
        version: '0.0.0',
      },
    },
  },
  host: {
    os: {
      Ext: {
        variant: 'Windows 10 Enterprise Evaluation',
      },
      kernel: '2004 (10.0.19041.388)',
      name: 'Windows',
      family: 'windows',
      version: '2004 (10.0.19041.388)',
      platform: 'windows',
      full: 'Windows 10 Enterprise Evaluation 2004 (10.0.19041.388)',
    },
  },
  event: {
    kind: 'alert',
  },
  cluster_uuid: 'kLbKvSMcRiiFAR0t8LebDA',
  cluster_name: 'elasticsearch',
};

const ExampleSecurityPayload: React.FC = () => {
  return (
    <EuiCodeBlock language="js">{JSON.stringify(exampleSecurityPayload, null, 2)}</EuiCodeBlock>
  );
};

// Used for lazy import
// eslint-disable-next-line import/no-default-export
export default ExampleSecurityPayload;
