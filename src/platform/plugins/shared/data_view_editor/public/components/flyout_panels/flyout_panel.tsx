/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  CSSProperties,
  useState,
  useLayoutEffect,
  useCallback,
  createContext,
  useContext,
} from 'react';
import { css } from '@emotion/react';
import { EuiFlexItem, type UseEuiTheme } from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';

import { useFlyoutPanelsContext } from './flyout_panels';

interface Context {
  registerFooter: () => void;
  registerContent: () => void;
}

const flyoutPanelContext = createContext<Context>({
  registerFooter: () => {},
  registerContent: () => {},
});

export interface Props {
  /** Width of the panel (in percent %) */
  width?: number;
  /** EUI sass background */
  backgroundColor?: 'euiPageBackground' | 'euiEmptyShade';
  /** Add a border to the panel */
  border?: 'left' | 'right';
}

export const Panel: React.FC<Props & React.HTMLProps<HTMLDivElement>> = ({
  children,
  width,
  className = '',
  backgroundColor,
  border,
  ...rest
}) => {
  const styles = useMemoCss(componentStyles);
  const [config, setConfig] = useState<{ hasFooter: boolean; hasContent: boolean }>({
    hasContent: false,
    hasFooter: false,
  });

  const { addPanel } = useFlyoutPanelsContext();

  const registerContent = useCallback(() => {
    setConfig((prev) => {
      return {
        ...prev,
        hasContent: true,
      };
    });
  }, []);

  const registerFooter = useCallback(() => {
    setConfig((prev) => {
      if (!prev.hasContent) {
        throw new Error(
          'You need to add a <FlyoutPanels.Content /> when you add a <FlyoutPanels.Footer />'
        );
      }
      return {
        ...prev,
        hasFooter: true,
      };
    });
  }, []);

  useLayoutEffect(() => {
    const removePanel = addPanel({ width });

    return removePanel;
  }, [width, addPanel]);

  const dynamicStyles: CSSProperties = {};

  if (width) {
    dynamicStyles.flexBasis = `${width}%`;
  }

  return (
    <EuiFlexItem css={styles.flyoutColumn} style={dynamicStyles}>
      <flyoutPanelContext.Provider value={{ registerContent, registerFooter }}>
        <div
          css={[
            styles.flyoutPanel,
            backgroundColor === 'euiPageBackground' && styles.pageBackground,
            backgroundColor === 'euiEmptyShade' && styles.emptyShade,
            border === 'left' && styles.leftBorder,
            border === 'right' && styles.rightBorder,
            config.hasContent && styles.withContent,
          ]}
          {...rest}
        >
          {children}
        </div>
      </flyoutPanelContext.Provider>
    </EuiFlexItem>
  );
};

export const useFlyoutPanelContext = (): Context => {
  const ctx = useContext(flyoutPanelContext);

  if (ctx === undefined) {
    throw new Error('useFlyoutPanel() must be used within a <flyoutPanelContext.Provider />');
  }

  return ctx;
};

const componentStyles = {
  flyoutColumn: css({
    height: '100%',
    overflow: 'hidden',
  }),
  flyoutPanel: ({ euiTheme }: UseEuiTheme) =>
    css({
      height: '100%',
      overflowY: 'auto',
      padding: euiTheme.size.l,
    }),
  pageBackground: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.body,
    }),
  emptyShade: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.emptyShade,
    }),
  leftBorder: ({ euiTheme }: UseEuiTheme) =>
    css({
      borderLeft: euiTheme.border.thin,
    }),
  rightBorder: ({ euiTheme }: UseEuiTheme) =>
    css({
      borderRight: euiTheme.border.thin,
    }),
  withContent: css({
    padding: 0,
    overflowY: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  }),
};
