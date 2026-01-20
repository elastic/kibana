/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { i18n } from '@kbn/i18n';
import type { PropertyValidationContext } from '@kbn/workflows/types/latest';
import {
  ExternalStepTypeId,
  externalStepCommonDefinition,
} from '../../common/step_types/external_step';
import type { IExampleExternalService } from '../../common/external_service/types';

export const getExternalStepDefinition = (deps: { externalService: IExampleExternalService }) =>
  createPublicStepDefinition({
    ...externalStepCommonDefinition,
    icon: React.lazy(() =>
      import('@elastic/eui/es/components/icon/assets/globe').then(({ icon }) => ({ default: icon }))
    ),
    label: i18n.translate('workflowsExtensionsExample.externalStep.label', {
      defaultMessage: 'External Step',
    }),
    description: i18n.translate('workflowsExtensionsExample.externalStep.description', {
      defaultMessage: 'Executes an external service operation',
    }),
    documentation: {
      details: i18n.translate('workflowsExtensionsExample.externalStep.documentation.details', {
        defaultMessage: `The ${ExternalStepTypeId} step allows you to store values in the workflow context that can be referenced in later steps using template syntax like {templateSyntax}.`,
        values: { templateSyntax: '`{{ steps.stepName.output.response }}`' }, // Needs to be extracted so it is not interpreted as a variable by the i18n plugin
      }),
      examples: [
        `## Execute an external service operation
\`\`\`yaml
- name: external_step
  type: ${ExternalStepTypeId}
  with:
    input: "Hello World"
\`\`\``,

        `## Execute an external service operation with a proxy
\`\`\`yaml
- name: external_step
  type: ${ExternalStepTypeId}
  proxyId: "my-proxy"
  with:
    input: "Hello World"
\`\`\``,
      ],
    },
    editorHandlers: {
      config: {
        'proxy.id': {
          completion: {
            getOptions: async (currentValue) => {
              const proxies = await deps.externalService.getProxies();
              const currentValueString =
                typeof currentValue === 'string' ? currentValue.trim() : '';
              return proxies
                .filter(
                  (proxy) =>
                    currentValueString.length === 0 || proxy.id.includes(currentValueString)
                )
                .map((proxy) => ({
                  label: proxy.id,
                  value: proxy.id,
                  detail: 'URL: ' + proxy.url,
                }));
            },
          },
          validation: {
            validate: async (value, _context: PropertyValidationContext) => {
              if (value === null) {
                return { severity: null };
              }
              if (typeof value !== 'string') {
                return { severity: 'error', message: 'Proxy ID must be a string' };
              }
              const proxy = await deps.externalService.getProxy(value);
              if (!proxy) {
                return {
                  severity: 'error',
                  message: 'Proxy not found',
                  hoverMessage: 'Manage your proxies [here](https://example.com/proxies)',
                };
              }
              return { severity: null, afterMessage: `✓ Proxy connected (${proxy.url})` };
            },
          },
        },
      },
      input: {
        input: {
          completion: {
            getOptions: async (currentValue) => {
              if (!currentValue || currentValue.length === 0) {
                return [
                  {
                    label: 'Hello World',
                    value: 'Hello World',
                  },
                ];
              }
              return [];
            },
          },
        },
      },
    },
  });
