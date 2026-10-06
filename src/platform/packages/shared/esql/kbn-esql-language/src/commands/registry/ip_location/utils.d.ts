/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstIpLocationCommand } from '@elastic/esql/types';
import type { ElasticsearchCommandOutputVariant, SupportedDataType } from '../../definitions/types';
export declare enum IpLocationPosition {
  AFTER_IP_LOCATION_KEYWORD = 'after_ip_location_keyword',
  AFTER_TARGET_FIELD = 'after_target_field',
  AFTER_ASSIGN = 'after_assign',
  AFTER_EXPRESSION = 'after_expression',
  AFTER_WITH_KEYWORD = 'after_with_keyword',
  WITHIN_OPTIONS = 'within_options',
  WITHIN_PROPERTIES_ARRAY = 'within_properties_array',
  AFTER_COMMAND = 'after_command',
}
/** Keeps only properties included by ES when the user does not pass properties. */
export declare const getDefaultPropertyNames: (
  variant: ElasticsearchCommandOutputVariant
) => string[];
/** Resolves a property type when no concrete database variant is available. */
export declare const getPropertyTypeFromAnyVariant: (
  property: string
) => SupportedDataType | undefined;
/** Selects the output variant that controls which columns IP_LOCATION creates. */
export declare const getIpLocationVariant: (
  command: ESQLAstIpLocationCommand
) => ElasticsearchCommandOutputVariant | undefined;
/** Lists properties that autocomplete can suggest for the active database file. */
export declare const getPropertyNamesForDatabase: (command: ESQLAstIpLocationCommand) => string[];
/** Converts the target field AST into the prefix used for generated column names. */
export declare const getIpLocationTargetPrefix: (
  command: ESQLAstIpLocationCommand
) => string | undefined;
/** Maps the cursor location to the autocomplete state for IP_LOCATION syntax. */
export declare function getPosition(
  command: ESQLAstIpLocationCommand,
  innerText: string
): IpLocationPosition;
