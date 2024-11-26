/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

require('../../../src/setup_node_env');
const { join, resolve } = require('path');
const { bundle } = require('@kbn/openapi-bundler');

const ROOT = resolve(__dirname, '..');

(async () => {
  await bundle({
    sourceGlob: join(ROOT, 'api/**/*.schema.yaml'),
    outputFilePath: join(
      ROOT,
      'docs/openapi/serverless/security_solution_exceptions_api_{version}.bundled.schema.yaml'
    ),
    options: {
      includeLabels: ['serverless'],
      prototypeDocument: {
        info: {
          title: 'Security Exceptions API (Elastic Cloud Serverless)',
          description:
            "Exceptions API allows you to manage detection rule exceptions to prevent a rule from generating an alert from incoming events even when the rule's other criteria are met.",
        },
        tags: [
          {
            name: 'Security Exceptions API',
            'x-displayName': 'Security exceptions',
            description:
              "Exceptions API allows you to manage detection rule exceptions to prevent a rule from generating an alert from incoming events even when the rule's other criteria are met.",
          },
        ],
      },
    },
  });

  await bundle({
    sourceGlob: join(ROOT, 'api/**/*.schema.yaml'),
    outputFilePath: join(
      ROOT,
      'docs/openapi/ess/security_solution_exceptions_api_{version}.bundled.schema.yaml'
    ),
    options: {
      includeLabels: ['ess'],
      prototypeDocument: {
        info: {
          title: 'Security Exceptions API (Elastic Cloud and self-hosted)',
          description:
            "Exceptions API allows you to manage detection rule exceptions to prevent a rule from generating an alert from incoming events even when the rule's other criteria are met.",
        },
        tags: [
          {
            name: 'Security Exceptions API',
            'x-displayName': 'Security exceptions',
            description:
              "Exceptions are associated with detection and endpoint rules, and are used to prevent a rule from generating an alert from incoming events even when the rule's other criteria are met. They can be used to reduce the number of false positives, and to prevent trusted processes and network activity from generating unnecessary alerts. \n\nExceptions are made up of:\n\n* Exception containers: A container for related exceptions. In general, a single exception container contains all the exception items relevant for a subset of rules. For example, a container can be used to group together network-related exceptions that are relevant for a large number of network rules. The container can then be associated with all the relevant rules.\n* Exception items: The query (fields, values, and logic) used to prevent rules from generating alerts. When an exception item's query evaluates to true, the rule does not generate an alert.\nFor detection rules, you can also use lists to define rule exceptions. A list holds multiple values of the same Elasticsearch data type, such as IP addresses, which are used to determine when an exception prevents an alert from being generated.\n\nIMPORTANT: You cannot use lists with endpoint rule exceptions.\n\nNOTE: Only exception containers can be associated with rules. You cannot directly associate an exception item or a list container with a rule. To use list exceptions, create an exception item that references the relevant list container.\n\n## Exceptions requirements\n\nBefore you start working with exceptions that use value lists, you must create the `.lists` and `.items` data streams for the relevant Kibana space. To learn how to do this, go to Lists index endpoint.\nOnce these data streams are created, your role needs privileges to manage rules. Refer to Enable and access detections for a complete list of requirements.",
          },
        ],
      },
    },
  });
})();
