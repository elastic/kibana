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
      'docs/openapi/serverless/security_solution_lists_api_{version}.bundled.schema.yaml'
    ),
    options: {
      includeLabels: ['serverless'],
      prototypeDocument: {
        info: {
          title: 'Security Lists API (Elastic Cloud Serverless)',
          description: 'Lists API allows you to manage lists of keywords, IPs or IP ranges items.',
        },
        tags: [
          {
            name: 'Security Lists API',
            'x-displayName': 'Security lists',
            description:
              "Lists can be used with detection rule exceptions to define values that prevent a rule from generating alerts.\n\n\
Lists are made up of:\n\n\
* **List containers**: A container for values of the same Elasticsearch data type. The following data types can be used:\n\
    * `boolean`\n\
    * `byte`\n\
    * `date`\n\
    * `date_nanos`\n\
    * `date_range`\n\
    * `double`\n\
    * `double_range`\n\
    * `float`\n\
    * `float_range`\n\
    * `half_float`\n\
    * `integer`\n\
    * `integer_range`\n\
    * `ip`\n\
    * `ip_range`\n\
    * `keyword`\n\
    * `long`\n\
    * `long_range`\n\
    * `short`\n\
    * `text`\n\
* **List items**: The values used to determine whether the exception prevents an alert from being generated.\n\n\
All list items in the same list container must be of the same data type, and each item defines a single value. For example, an IP list container named `internal-ip-addresses-southport` contains five items, where each item defines one internal IP address:\n\
1. `192.168.1.1`\n\
2. `192.168.1.3`\n\
3. `192.168.1.18`\n\
4. `192.168.1.12`\n\
5. `192.168.1.7`\n\n\
To use these IP addresses as values for defining rule exceptions, use the Security exceptions API to create an exception item that references the `internal-ip-addresses-southport` list.\n\
> info\n\
> Lists cannot be added directly to rules, nor do they define the operators used to determine when exceptions are applied (`is in list`, `is not in list`). Use an exception item to define the operator and associate it with an exception container. You can then add the exception container to a rule's `exceptions_list` object.\n\n\
## Lists requirements\n\n\
Before you can start using lists, you must create the `.lists` and `.items` data streams for the relevant Kibana space. To do this, use the Create list data streams endpoint. Once these data streams are created, your role needs privileges to manage rules. Refer to [Enable and access detections](https://www.elastic.co/guide/en/serverless/current/security-detections-requirements.html#enable-detections-ui) for a complete list of requirements.",
          },
        ],
      },
    },
  });

  await bundle({
    sourceGlob: join(ROOT, 'api/**/*.schema.yaml'),
    outputFilePath: join(
      ROOT,
      'docs/openapi/ess/security_solution_lists_api_{version}.bundled.schema.yaml'
    ),
    options: {
      includeLabels: ['ess'],
      prototypeDocument: {
        info: {
          title: 'Security Lists API (Elastic Cloud and self-hosted)',
          description: 'Lists API allows you to manage lists of keywords, IPs or IP ranges items.',
        },
        tags: [
          {
            name: 'Security Lists API',
            'x-displayName': 'Security lists',
            description:
              "Lists can be used with detection rule exceptions to define values that prevent a rule from generating alerts.\n\n\
Lists are made up of:\n\n\
* **List containers**: A container for values of the same Elasticsearch data type. The following data types can be used:\n\
    * `boolean`\n\
    * `byte`\n\
    * `date`\n\
    * `date_nanos`\n\
    * `date_range`\n\
    * `double`\n\
    * `double_range`\n\
    * `float`\n\
    * `float_range`\n\
    * `half_float`\n\
    * `integer`\n\
    * `integer_range`\n\
    * `ip`\n\
    * `ip_range`\n\
    * `keyword`\n\
    * `long`\n\
    * `long_range`\n\
    * `short`\n\
    * `text`\n\
* **List items**: The values used to determine whether the exception prevents an alert from being generated.\n\n\
All list items in the same list container must be of the same data type, and each item defines a single value. For example, an IP list container named `internal-ip-addresses-southport` contains five items, where each item defines one internal IP address:\n\
1. `192.168.1.1`\n\
2. `192.168.1.3`\n\
3. `192.168.1.18`\n\
4. `192.168.1.12`\n\
5. `192.168.1.7`\n\n\
To use these IP addresses as values for defining rule exceptions, use the Security exceptions API to create an exception item that references the `internal-ip-addresses-southport` list.\n\
> info\n\
> Lists cannot be added directly to rules, nor do they define the operators used to determine when exceptions are applied (`is in list`, `is not in list`). Use an exception item to define the operator and associate it with an exception container. You can then add the exception container to a rule's `exceptions_list` object.\n\n\
## Lists requirements\n\n\
Before you can start using lists, you must create the `.lists` and `.items` data streams for the relevant Kibana space. To do this, use the Create list data streams endpoint. Once these data streams are created, your role needs privileges to manage rules. Refer to [Enable and access detections](https://www.elastic.co/guide/en/security/master/detections-permissions-section.html#enable-detections-ui) for a complete list of requirements.",
          },
        ],
      },
    },
  });
})();
