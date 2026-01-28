/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLoadingSpinner, EuiBadge } from '@elastic/eui';
import { ToolbarSelector, type SelectableEntry } from '@kbn/shared-ux-toolbar-selector';
import { comboBoxFieldOptionMatcher } from '@kbn/field-utils';
import { css } from '@emotion/react';
import type { Dimension } from '../../types';
import {
  MAX_DIMENSIONS_SELECTIONS,
  METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ,
} from '../../common/constants';
import {
  findAvailableEntities,
  findEntityByAttribute,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
} from '../../common/entity_definitions';

interface DimensionsSelectorProps {
  fields: Array<{ dimensions: Dimension[] }>;
  dimensions: Dimension[];
  selectedDimensions: Dimension[];
  fullWidth?: boolean;
  onChange: (dimensions: Dimension[]) => void;
  singleSelection?: boolean;
  isLoading?: boolean;
}

export const DimensionsSelector = ({
  fields,
  dimensions,
  selectedDimensions,
  onChange,
  fullWidth = false,
  singleSelection = false,
  isLoading = false,
}: DimensionsSelectorProps) => {
  const selectedNamesSet = useMemo(
    () => new Set(selectedDimensions.map((d) => d.name)),
    [selectedDimensions]
  );

  const intersectingDimensions = useMemo(() => {
    if (selectedNamesSet.size === 0) {
      return new Set(dimensions.map((d) => d.name));
    }

    const result = new Set<string>();
    for (const field of fields) {
      const fieldDimNames = new Set(field.dimensions.map((d) => d.name));

      if (fieldDimNames.size < selectedNamesSet.size) {
        continue;
      }

      let hasAllSelected = true;
      for (const sel of selectedNamesSet) {
        if (!fieldDimNames.has(sel)) {
          hasAllSelected = false;
          break;
        }
      }

      if (hasAllSelected) {
        fieldDimNames.forEach((name) => result.add(name));
      }
    }

    return result;
  }, [fields, selectedNamesSet, dimensions]);

  const options: SelectableEntry[] = useMemo(() => {
    const isAtMaxLimit = selectedDimensions.length >= MAX_DIMENSIONS_SELECTIONS;
    const dimensionNames = dimensions.map((d) => d.name);
    const availableEntities = findAvailableEntities(dimensionNames);
    const matchedAttributes = new Set(availableEntities.map((e) => e.identifyingAttribute));

    const createOption = (
      dimension: Dimension,
      entity?: { displayName: string; iconType: string; identifyingAttribute: string }
    ): SelectableEntry => {
      const isSelected = selectedNamesSet.has(dimension.name);
      const isIntersecting = intersectingDimensions.has(dimension.name);
      const isDisabledByLimit = singleSelection ? false : !isSelected && isAtMaxLimit;

      return {
        value: dimension.name,
        label: entity ? entity.displayName : dimension.name,
        checked: isSelected ? 'on' : undefined,
        disabled: singleSelection ? false : !isIntersecting || isDisabledByLimit,
        key: dimension.name,
        prepend: entity ? <EuiIcon type={entity.iconType} size="s" /> : undefined,
        append: entity ? (
          <EuiBadge color="hollow" css={css({ marginLeft: 4 })}>
            {entity.identifyingAttribute}
          </EuiBadge>
        ) : undefined,
      };
    };

    // Group entities by category
    const entityOptions: SelectableEntry[] = [];
    for (const category of CATEGORY_ORDER) {
      const entitiesInCategory = availableEntities.filter((e) => e.category === category);
      if (entitiesInCategory.length === 0) continue;

      // Add category group label
      entityOptions.push({
        label: CATEGORY_LABELS[category],
        isGroupLabel: true,
        key: `category-${category}`,
        value: '',
      });

      // Add entity options for this category
      for (const entity of entitiesInCategory) {
        const dimension = dimensions.find((d) => d.name === entity.identifyingAttribute);
        if (dimension) {
          entityOptions.push(createOption(dimension, entity));
        }
      }
    }

    // Other dimensions that don't match entities
    const otherDimensions = dimensions.filter((d) => !matchedAttributes.has(d.name));

    // Build final options array
    const finalOptions: SelectableEntry[] = [];

    if (entityOptions.length > 0) {
      finalOptions.push({
        label: i18n.translate('metricsExperience.dimensionsSelector.entitiesGroupLabel', {
          defaultMessage: 'Entities',
        }),
        isGroupLabel: true,
        key: 'entities-header',
        value: '',
      });
      finalOptions.push(...entityOptions);
    }

    if (otherDimensions.length > 0) {
      finalOptions.push({
        label: i18n.translate('metricsExperience.dimensionsSelector.otherDimensionsGroupLabel', {
          defaultMessage: 'Other dimensions',
        }),
        isGroupLabel: true,
        key: 'other-dimensions-header',
        value: '',
      });
      for (const dimension of otherDimensions) {
        finalOptions.push(createOption(dimension));
      }
    }

    // If no entities found, just return flat list
    if (finalOptions.length === 0) {
      return dimensions.map((dimension) => createOption(dimension));
    }

    return finalOptions;
  }, [
    dimensions,
    selectedNamesSet,
    selectedDimensions.length,
    intersectingDimensions,
    singleSelection,
  ]);

  const handleChange = useCallback(
    (chosenOption?: SelectableEntry | SelectableEntry[]) => {
      const opts =
        chosenOption == null ? [] : Array.isArray(chosenOption) ? chosenOption : [chosenOption];
      const selectedValues = new Set(opts.map((p) => p.value));
      const newSelection = dimensions.filter((d) => selectedValues.has(d.name));
      // Enforce the maximum limit
      const limitedSelection = newSelection.slice(0, MAX_DIMENSIONS_SELECTIONS);
      onChange(limitedSelection);
    },
    [onChange, dimensions]
  );

  const buttonLabel = useMemo(() => {
    const count = selectedDimensions.length;
    const selectedDimension = selectedDimensions[0];

    // Try to find entity for the selected dimension to display its name
    const entity = selectedDimension ? findEntityByAttribute(selectedDimension.name) : undefined;
    const dimensionLabel = entity ? entity.displayName : selectedDimension?.name;

    return (
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
        <EuiFlexItem
          grow={false}
          css={css`
            align-items: flex-start;
          `}
        >
          {count === 0 ? (
            <FormattedMessage
              id="metricsExperience.dimensionsSelector.breakdownFieldButtonLabel"
              defaultMessage="No {maxDimensions, plural, one {dimension} other {dimensions}} selected"
              values={{ maxDimensions: MAX_DIMENSIONS_SELECTIONS }}
            />
          ) : (
            <FormattedMessage
              id="metricsExperience.dimensionsSelector.breakdownFieldButtonLabelWithSelection"
              defaultMessage="Breakdown by {dimensionLabel}"
              values={{ dimensionLabel }}
            />
          )}
        </EuiFlexItem>
        {isLoading && (
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }, [selectedDimensions, isLoading]);

  return (
    <ToolbarSelector
      data-test-subj={METRICS_BREAKDOWN_SELECTOR_DATA_TEST_SUBJ}
      data-selected-value={[...selectedNamesSet]}
      searchable
      buttonLabel={buttonLabel}
      optionMatcher={comboBoxFieldOptionMatcher}
      options={options}
      singleSelection={singleSelection}
      onChange={handleChange}
      fullWidth={fullWidth}
      hasArrow={!isLoading}
    />
  );
};
