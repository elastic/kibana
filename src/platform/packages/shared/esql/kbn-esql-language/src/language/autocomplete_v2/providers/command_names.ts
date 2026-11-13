/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LicenseType } from '@kbn/licensing-types';
import { getCommandAutocompleteDefinitions } from '../../../commands/registry/complete_items';
import type { ICommand } from '../../../commands/registry/registry';
import type { ISuggestionItem } from '../../../commands/registry/types';
import { getRegisteredCommand } from '../command_metadata';
import type { SuggestionContext } from '../types';

/** Whether a registered command may be offered, by what its metadata asks for. */
const isAvailable = (
  { metadata }: ICommand,
  {
    hasLicense,
    activeProduct,
    precedingCommands,
    sourceIsTimeSeries,
    queryContainsSubqueries,
  }: SuggestionContext
): boolean => {
  const { license, observabilityTier, requiresTimeseriesSource, hiddenAfterCommands } = metadata;

  if (license && !hasLicense?.(license.toLocaleLowerCase() as LicenseType)) {
    return false;
  }

  const isOtherTier =
    observabilityTier !== undefined &&
    activeProduct?.type === 'observability' &&
    activeProduct.tier !== observabilityTier.toLocaleLowerCase();
  if (isOtherTier) {
    return false;
  }

  if (requiresTimeseriesSource && !sourceIsTimeSeries) {
    return false;
  }

  if (queryContainsSubqueries && metadata.hiddenWhenQueryContainsSubqueries) {
    return false;
  }

  return !hiddenAfterCommands?.some((name) =>
    precedingCommands.some((preceding) => preceding.name === name)
  );
};

/**
 * The names of the commands the grammar allows here, for the commands Kibana has registered
 * and may offer. A command the grammar has and Kibana has not adopted is left out.
 */
export const provideCommandNames = (
  commandRules: string[],
  context: SuggestionContext
): ISuggestionItem[] => {
  const names = new Set(
    commandRules
      .map(getRegisteredCommand)
      .filter((command): command is ICommand => command !== undefined)
      .filter((command) => isAvailable(command, context))
      .map(({ name }) => name)
  );

  return getCommandAutocompleteDefinitions([...names]);
};
