/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { CSSProperties, useEffect } from 'react';
import classnames from 'classnames';
import { EuiFlexItem } from '@elastic/eui';

import { useFlyoutPanelsContext } from './flyout_panels';

interface Props {
  /** Width of the panel (in percent %) */
  width?: number;
  /** EUI sass background */
  backgroundColor?: 'euiColorLightestShade' | 'euiColorLightShade' | 'euiColorMediumShade';
  /** Flag to indicate if this panel has a footer */
  withFooter?: boolean;
}

export const Panel: React.FC<Props & React.HTMLProps<HTMLDivElement>> = ({
  children,
  width,
  className = '',
  backgroundColor,
  withFooter,
  ...rest
}) => {
  /* eslint-disable @typescript-eslint/naming-convention */
  const classes = classnames('fieldEditor__flyoutPanel', className, {
    'fieldEditor__flyoutPanel--lightestShade': backgroundColor === 'euiColorLightestShade',
    'fieldEditor__flyoutPanel--lightShade': backgroundColor === 'euiColorLightShade',
    'fieldEditor__flyoutPanel--mediumShade': backgroundColor === 'euiColorMediumShade',
    'fieldEditor__flyoutPanel--withFooter': Boolean(withFooter),
  });
  /* eslint-enable @typescript-eslint/naming-convention */

  const { addPanel } = useFlyoutPanelsContext();

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
      <div className={classes} {...rest}>
        {children}
      </div>
    </EuiFlexItem>
  );
};
