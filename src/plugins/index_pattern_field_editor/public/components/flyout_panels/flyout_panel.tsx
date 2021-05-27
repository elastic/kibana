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
  useEffect,
  useCallback,
  createContext,
  useContext,
} from 'react';
import classnames from 'classnames';
import { EuiFlexItem } from '@elastic/eui';

import { useFlyoutPanelsContext } from './flyout_panels';

interface Context {
  registerFooter: () => void;
}

const flyoutPanelContext = createContext<Context>({
  registerFooter: () => {},
});

export interface Props {
  /** Width of the panel (in percent %) */
  width?: number;
  /** EUI sass background */
  backgroundColor?: 'euiColorLightestShade' | 'euiColorLightShade' | 'euiColorMediumShade';
}

export const Panel: React.FC<Props & React.HTMLProps<HTMLDivElement>> = ({
  children,
  width,
  className = '',
  backgroundColor,
  ...rest
}) => {
  const [hasFooter, setHasFooter] = useState(false);

  /* eslint-disable @typescript-eslint/naming-convention */
  const classes = classnames('fieldEditor__flyoutPanel', className, {
    'fieldEditor__flyoutPanel--lightestShade': backgroundColor === 'euiColorLightestShade',
    'fieldEditor__flyoutPanel--lightShade': backgroundColor === 'euiColorLightShade',
    'fieldEditor__flyoutPanel--mediumShade': backgroundColor === 'euiColorMediumShade',
    'fieldEditor__flyoutPanel--withFooter': hasFooter,
  });
  /* eslint-enable @typescript-eslint/naming-convention */

  const { addPanel } = useFlyoutPanelsContext();

  const registerFooter = useCallback(() => {
    setHasFooter(true);
  }, []);

  useEffect(() => {
    const removePanel = addPanel({ width });

    return removePanel;
  }, [width, addPanel]);

  const styles: CSSProperties = {
    position: 'relative',
  };

  if (width) {
    styles.flexBasis = `${width}%`;
  }

  return (
    <EuiFlexItem style={styles}>
      <flyoutPanelContext.Provider value={{ registerFooter }}>
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
