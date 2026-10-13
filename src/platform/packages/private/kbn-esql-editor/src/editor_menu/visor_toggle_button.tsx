/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import {
  SvgAiGradientDefs,
  useAiButtonGradientStyles,
  useSvgAiGradient,
} from '@kbn/ui-ai-components';
import { searchPlaceholder } from '../editor_visor/visor_i18n';
import { MagnifySparklesIcon } from './magnify_sparkles_icon';

interface VisorToggleButtonProps {
  isNlToEsqlEnabled: boolean;
  isVisorOpen: boolean;
  tooltip: string;
  onToggle?: () => void;
}

/**
 * Footer button that opens and closes the quick search visor. While the visor is open in natural
 * language mode it takes the AI button look. The look is applied with styles on the same button,
 * so toggling the visor never remounts it and keyboard focus stays on it.
 */
export function VisorToggleButton({
  isNlToEsqlEnabled,
  isVisorOpen,
  tooltip,
  onToggle,
}: VisorToggleButtonProps) {
  const isAiStyled = isVisorOpen && isNlToEsqlEnabled;
  const { buttonCss } = useAiButtonGradientStyles({ iconOnly: true });
  const { gradientId, iconGradientCss, colors } = useSvgAiGradient();

  return (
    <>
      {isAiStyled && <SvgAiGradientDefs gradientId={gradientId} colors={colors} />}
      <EuiToolTip position="top" content={tooltip} disableScreenReaderOutput>
        <EuiButtonIcon
          iconType={isNlToEsqlEnabled ? MagnifySparklesIcon : 'search'}
          size="xs"
          color="text"
          css={isAiStyled ? [buttonCss, iconGradientCss] : undefined}
          aria-label={searchPlaceholder}
          aria-pressed={isVisorOpen}
          onClick={onToggle}
          isDisabled={!onToggle}
          data-test-subj="esql-menu-button"
        />
      </EuiToolTip>
    </>
  );
}
