/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, createContext, useContext, useCallback, useMemo, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexGroupProps } from '@elastic/eui';

import './flyout_panels.scss';

interface Panel {
  width: number;
}

interface Context {
  addPanel: (panel: Panel) => number;
  removePanel: (id: number) => void;
}

let idx = 0;

const panelId = () => idx++;

const flyoutPanelsContext = createContext<Context>({
  addPanel() {
    return -1;
  },
  removePanel() {},
});

interface Props {
  /**
   * The total max width with all the panels in the DOM
   * Corresponds to the "maxWidth" prop passed to the EuiFlyout
   */
  maxWidth: number;
  /** The className selector of the flyout */
  flyoutClassName: string;
  /** The size between the panels. Corresponds to EuiFlexGroup gutterSize */
  gutterSize?: EuiFlexGroupProps['gutterSize'];
}

export const Panels: React.FC<Props> = ({ maxWidth, flyoutClassName, ...props }) => {
  const flyoutDOMelement = useMemo(() => {
    const el = document.getElementsByClassName(flyoutClassName);

    if (el.length === 0) {
      throw new Error(`Flyout with className "${flyoutClassName}" not found.`);
    }

    return el.item(0) as HTMLDivElement;
  }, [flyoutClassName]);

  const [panels, setPanels] = useState<{ [id: number]: Panel }>({});

  const addPanel = useCallback((panel: Panel) => {
    const nextId = panelId();
    setPanels((prev) => ({ ...prev, [nextId]: panel }));
    return nextId;
  }, []);

  const removePanel = useCallback((id: number) => {
    setPanels((prev) => {
      const { [id]: panelToRemove, ...rest } = prev;
      return rest;
    });
  }, []);

  const ctx: Context = useMemo(
    () => ({
      addPanel,
      removePanel,
    }),
    [addPanel, removePanel]
  );

  useEffect(() => {
    const totalPercentWidth = Object.values(panels).reduce((acc, { width }) => acc + width, 0);
    const currentWidth = (maxWidth * totalPercentWidth) / 100;

    flyoutDOMelement.style.maxWidth = `${currentWidth}px`;
  }, [panels, maxWidth, flyoutClassName, flyoutDOMelement]);

  return (
    <flyoutPanelsContext.Provider value={ctx}>
      <flyoutPanelsContext.Consumer>
        {({}) => {
          return (
            <EuiFlexGroup className="fieldEditor__flyoutPanels" gutterSize="none" {...props} />
          );
        }}
      </flyoutPanelsContext.Consumer>
    </flyoutPanelsContext.Provider>
  );
};

export const useFlyoutPanelsContext = (): Context => {
  const ctx = useContext(flyoutPanelsContext);

  if (ctx === undefined) {
    throw new Error('<Panel /> must be used within a <Panels /> wrapper');
  }

  return ctx;
};
