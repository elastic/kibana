/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { stringify, type ToStringOptions } from 'yaml';
import { isMac } from '../../../../shared/utils/is_mac';
import { getRequiredParamsForConnector } from '../get_required_params_for_connector';
import { getCachedAllConnectors } from '../connectors_cache';

interface GenerateConnectorSnippetOptions {
  full?: boolean;
  withStepsSection?: boolean;
}

/**
 * Generates a YAML snippet for a workflow connector step based on the specified type.
 * @param connectorType - The type of connector to generate a snippet for
 * @param options - Configuration options for snippet generation
 * @param options.full - Whether to include the full YAML structure with step name and type prefix
 * @param options.withStepsSection - Whether to include the "steps:" section
 * @returns The formatted YAML connector snippet with required parameters as placeholders
 */
export function generateConnectorSnippet(
  connectorType: string,
  { full, withStepsSection }: GenerateConnectorSnippetOptions = {}
): string {
  const stringifyOptions: ToStringOptions = { indent: 2 };
  let parameters: Record<string, any>;

  const isConnectorIdRequired = getCachedAllConnectors().find(
    (c) => c.type === connectorType
  )?.connectorIdRequired;
  // Get required parameters for this connector type
  const requiredParams = getRequiredParamsForConnector(connectorType);

  if (requiredParams.length === 0) {
    // No required params, just add empty with block with a placeholder
    const shortcut = isMac() ? '⌘+I' : 'Ctrl+Space';
    parameters = {
      with: {
        '': `# Add parameters here. Press ${shortcut} to see all available options`,
      },
    };
  } else {
    // Create with block with required parameters as placeholders
    parameters = {
      with: {},
    };
    requiredParams.forEach((param) => {
      const placeholder = param.example || param.defaultValue || '';
      parameters.with[param.name] = placeholder;
    });
  }

  if (full) {
    // if the full snippet is requested, return the whole step node as a sequence item
    // - name: ${stepType}_step
    //   type: ${stepType}
    //   ...parameters
    const step = [
      {
        name: `${connectorType.replaceAll('.', '_')}_step`,
        type: connectorType,
        'connector-id': isConnectorIdRequired ? '# A Kibana connector name' : undefined,
        ...parameters,
      },
    ];
    if (withStepsSection) {
      return stringify({ steps: step }, stringifyOptions);
    }
    return stringify(step, stringifyOptions);
  }

  // otherwise, the "type:" is already present, so we just return the type value and parameters
  // (type:)${stepType}
  // ...parameters
  return `${connectorType}\n${stringify(parameters, stringifyOptions)}`;
}
