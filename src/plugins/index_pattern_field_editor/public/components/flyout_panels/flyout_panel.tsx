/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, {
  CSSProperties,
  useState,
  useLayoutEffect,
  useCallback,
  createContext,
  useContext,
  useMemo,
} from 'react';
import classnames from 'classnames';
import { EuiFlexItem } from '@elastic/eui';

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
  /** Width of the panel (in percent % or in px if the "fixedPanelWidths" prop is set to true on the panels group) */
  width?: number;
  /** EUI sass background */
  backgroundColor?: 'euiPageBackground' | 'euiEmptyShade';
  /** Add a border to the panel */
  border?: 'left' | 'right';
  'data-test-subj'?: string;
}

export const Panel: React.FC<Props & React.HTMLProps<HTMLDivElement>> = ({
  children,
  width,
  className = '',
  backgroundColor,
  border,
  'data-test-subj': dataTestSubj,
  ...rest
}) => {
  const [config, setConfig] = useState<{ hasFooter: boolean; hasContent: boolean }>({
    hasContent: false,
    hasFooter: false,
  });

  const [styles, setStyles] = useState<CSSProperties>({});

  const classes = classnames('fieldEditor__flyoutPanel', className, {
    'fieldEditor__flyoutPanel--pageBackground': backgroundColor === 'euiPageBackground',
    'fieldEditor__flyoutPanel--emptyShade': backgroundColor === 'euiEmptyShade',
    'fieldEditor__flyoutPanel--leftBorder': border === 'left',
    'fieldEditor__flyoutPanel--rightBorder': border === 'right',
    'fieldEditor__flyoutPanel--withContent': config.hasContent,
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

  const ctx = useMemo(
    () => ({ registerContent, registerFooter }),
    [registerFooter, registerContent]
  );

  useLayoutEffect(() => {
    const { removePanel, isFixedWidth } = addPanel({ width });

    if (width) {
      setStyles((prev) => {
        if (isFixedWidth) {
          return {
            ...prev,
            width: `${width}px`,
          };
        }
        return {
          ...prev,
          minWidth: `${width}%`,
        };
      });
    }

    return removePanel;
  }, [width, addPanel]);

  return (
    <EuiFlexItem
      className="fieldEditor__flyoutPanels__column"
      style={styles}
      grow={false}
      data-test-subj={dataTestSubj}
    >
      <flyoutPanelContext.Provider value={ctx}>
        <div className={classes} {...rest}>
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
