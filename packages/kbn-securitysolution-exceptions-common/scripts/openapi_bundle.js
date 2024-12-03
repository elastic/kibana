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
              "Exceptions are associated with detection and endpoint rules, and are used to prevent a rule from generating an alert from incoming events, even when the rule's other criteria are met. They can help reduce the number of false positives and prevent trusted processes and network activity from generating unnecessary alerts.\n\n\
Exceptions are made up of:\n\n\
* **Exception containers**: A container for related exceptions. Generally, a single exception container contains all the exception items relevant for a subset of rules. For example, a container can be used to group together network-related exceptions that are relevant for a large number of network rules. The container can then be associated with all the relevant rules.\n\
* **Exception items**: The query (fields, values, and logic) used to prevent rules from generating alerts. When an exception item's query evaluates to `true`, the rule does not generate an alert.\n\n\
For detection rules, you can also use lists to define rule exceptions. A list holds multiple values of the same Elasticsearch data type, such as IP addresses. These values are used to determine when an exception prevents an alert from being generated.\n\
> info\n\
> You cannot use lists with endpoint rule exceptions.\n\n\
> info\n\
> Only exception containers can be associated with rules. You cannot directly associate an exception item or a list container with a rule. To use list exceptions, create an exception item that references the relevant list container.\n\n\
## Exceptions requirements\n\n\
Before you can start working with exceptions that use value lists, you must create the `.lists` and `.items` data streams for the relevant Kibana space. To do this, use the Create list data streams endpoint. Once these data streams are created, your role needs privileges to manage rules. For a complete list of requirements, refer to [Enable and access detections](https://www.elastic.co/guide/en/serverless/current/security-detections-requirements.html#enable-detections-ui).",
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
              "Exceptions are associated with detection and endpoint rules, and are used to prevent a rule from generating an alert from incoming events, even when the rule's other criteria are met. They can help reduce the number of false positives and prevent trusted processes and network activity from generating unnecessary alerts.\n\n\
Exceptions are made up of:\n\n\
* **Exception containers**: A container for related exceptions. Generally, a single exception container contains all the exception items relevant for a subset of rules. For example, a container can be used to group together network-related exceptions that are relevant for a large number of network rules. The container can then be associated with all the relevant rules.\n\
* **Exception items**: The query (fields, values, and logic) used to prevent rules from generating alerts. When an exception item's query evaluates to `true`, the rule does not generate an alert.\n\n\
For detection rules, you can also use lists to define rule exceptions. A list holds multiple values of the same Elasticsearch data type, such as IP addresses. These values are used to determine when an exception prevents an alert from being generated.\n\
> info\n\
> You cannot use lists with endpoint rule exceptions.\n\n\
> info\n\
> Only exception containers can be associated with rules. You cannot directly associate an exception item or a list container with a rule. To use list exceptions, create an exception item that references the relevant list container.\n\n\
## Exceptions requirements\n\n\
Before you can start working with exceptions that use value lists, you must create the `.lists` and `.items` data streams for the relevant Kibana space. To do this, use the Create list data streams endpoint. Once these data streams are created, your role needs privileges to manage rules. For a complete list of requirements, refer to [Enable and access detections](https://www.elastic.co/guide/en/security/master/detections-permissions-section.html#enable-detections-ui).",
          },
        ],
      },
    },
  });
})();
