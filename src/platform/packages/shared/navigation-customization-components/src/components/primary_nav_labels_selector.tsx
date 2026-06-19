/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormFieldset,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';

import { PrimaryNavLabelsIllustration } from './primary_nav_labels_illustration';

interface Props {
  hidePrimaryLabels: boolean;
  onChange: (hidePrimaryLabels: boolean) => void;
}

interface OptionCardProps {
  label: string;
  showText: boolean;
  isSelected: boolean;
  onSelect: () => void;
}

const PrimaryNavLabelsOptionCard = ({
  label,
  showText,
  isSelected,
  onSelect,
}: OptionCardProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      hasBorder={false}
      hasShadow={false}
      borderRadius="none"
      paddingSize="s"
      onClick={onSelect}
      aria-checked={isSelected}
      aria-label={label}
      element="button"
      role="radio"
      css={css`
        inline-size: 100%;
        text-align: start;
        box-shadow: inset 0 0 0
          ${isSelected ? euiTheme.border.width.thick : euiTheme.border.width.thin}
          ${isSelected ? euiTheme.colors.borderStrongPrimary : euiTheme.colors.borderBaseSubdued} !important;
        border-radius: ${euiTheme.border.radius.small};
        background-color: ${isSelected
          ? euiTheme.colors.backgroundBaseInteractiveSelect
          : euiTheme.colors.backgroundBasePlain};
        border: none;
        outline: none;
        transition: background-color ${euiTheme.animation.fast} ${euiTheme.animation.resistance};

        &:hover {
          transform: none;
          filter: none;
          box-shadow: inset 0 0 0
            ${isSelected ? euiTheme.border.width.thick : euiTheme.border.width.thin}
            ${isSelected ? euiTheme.colors.borderStrongPrimary : euiTheme.colors.borderBaseSubdued} !important;
          background-color: ${isSelected
            ? euiTheme.colors.backgroundBaseInteractiveSelectHover
            : euiTheme.colors.backgroundBaseInteractiveHover};
        }

        &:focus,
        &:focus-visible,
        &:not(:focus-visible) {
          transform: none;
          filter: none;
          outline: none;
          box-shadow: inset 0 0 0
            ${isSelected ? euiTheme.border.width.thick : euiTheme.border.width.thin}
            ${isSelected ? euiTheme.colors.borderStrongPrimary : euiTheme.colors.borderBaseSubdued} !important;
        }
      `}
    >
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <PrimaryNavLabelsIllustration showText={showText} selected={isSelected} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">
            <strong>{label}</strong>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const PrimaryNavLabelsSelector = ({ hidePrimaryLabels, onChange }: Props) => {
  const legend = i18n.translate('navigationCustomizationComponents.primaryNavLabelsLegend', {
    defaultMessage: 'Primary navigation labels',
  });
  const showLabelsLabel = i18n.translate('navigationCustomizationComponents.showLabelsLabel', {
    defaultMessage: 'Icons and text',
  });
  const hideLabelsLabel = i18n.translate('navigationCustomizationComponents.hideLabelsLabel', {
    defaultMessage: 'Icons only',
  });

  return (
    <EuiFormFieldset
      legend={{
        children: legend,
        display: 'hidden',
      }}
      data-test-subj="primaryNavLabelsSelector"
    >
      <div role="radiogroup" aria-label={legend}>
        <EuiFlexGrid columns={2} gutterSize="s">
          <EuiFlexItem data-test-subj="primaryNavLabelsShow">
            <PrimaryNavLabelsOptionCard
              label={showLabelsLabel}
              showText={true}
              isSelected={!hidePrimaryLabels}
              onSelect={() => onChange(false)}
            />
          </EuiFlexItem>
          <EuiFlexItem data-test-subj="primaryNavLabelsHide">
            <PrimaryNavLabelsOptionCard
              label={hideLabelsLabel}
              showText={false}
              isSelected={hidePrimaryLabels}
              onSelect={() => onChange(true)}
            />
          </EuiFlexItem>
        </EuiFlexGrid>
      </div>
    </EuiFormFieldset>
  );
};
