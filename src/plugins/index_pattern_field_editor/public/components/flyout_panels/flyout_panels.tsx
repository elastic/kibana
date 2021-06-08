/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, {
  useState,
  createContext,
  useContext,
  useCallback,
  useMemo,
  useLayoutEffect,
} from 'react';
import { EuiFlexGroup, EuiFlexGroupProps } from '@elastic/eui';

import './flyout_panels.scss';

interface Panel {
  width?: number;
}

interface Context {
  addPanel: (panel: Panel) => { removePanel: () => void; isFixedWidth: boolean };
}

let idx = 0;

const panelId = () => idx++;

const flyoutPanelsContext = createContext<Context>({
  addPanel() {
    return {
      removePanel: () => {},
      isFixedWidth: false,
    };
  },
});

export interface Props {
  /**
   * The total max width with all the panels in the DOM
   * Corresponds to the "maxWidth" prop passed to the EuiFlyout
   */
  maxWidth: number;
  /** The className selector of the flyout */
  flyoutClassName: string;
  /** The size between the panels. Corresponds to EuiFlexGroup gutterSize */
  gutterSize?: EuiFlexGroupProps['gutterSize'];
  /** Flag to indicate if the panels width are declared as fixed pixel width instead of percent */
  fixedPanelWidths?: boolean;
}

export const Panels: React.FC<Props> = ({
  maxWidth,
  flyoutClassName,
  fixedPanelWidths = false,
  ...props
}) => {
  const flyoutDOMelement = useMemo(() => {
    const el = document.getElementsByClassName(flyoutClassName);

    if (el.length === 0) {
      // throw new Error(`Flyout with className "${flyoutClassName}" not found.`);
      return null;
    }

    return el.item(0) as HTMLDivElement;
  }, [flyoutClassName]);

  const [panels, setPanels] = useState<{ [id: number]: Panel }>({});

  const removePanel = useCallback((id: number) => {
    setPanels((prev) => {
      const { [id]: panelToRemove, ...rest } = prev;
      return rest;
    });
  }, []);

  const addPanel = useCallback(
    (panel: Panel) => {
      const nextId = panelId();
      setPanels((prev) => {
        return { ...prev, [nextId]: panel };
      });

      return {
        removePanel: removePanel.bind(null, nextId),
        isFixedWidth: fixedPanelWidths,
      };
    },
    [removePanel, fixedPanelWidths]
  );

  const ctx: Context = useMemo(
    () => ({
      addPanel,
    }),
    [addPanel]
  );

  useLayoutEffect(() => {
    if (!flyoutDOMelement) {
      return;
    }

    let currentWidth: number;

    if (fixedPanelWidths) {
      const totalWidth = Object.values(panels).reduce((acc, { width = 0 }) => acc + width, 0);
      currentWidth = Math.min(maxWidth, totalWidth);
      flyoutDOMelement.style.width = `${currentWidth}px`;
      flyoutDOMelement.style.minWidth = `${currentWidth}px`;
      flyoutDOMelement.style.maxWidth = `${currentWidth}px`;
    } else {
      const totalPercentWidth = Math.min(
        100,
        Object.values(panels).reduce((acc, { width = 0 }) => acc + width, 0)
      );
      currentWidth = (maxWidth * totalPercentWidth) / 100;
      flyoutDOMelement.style.maxWidth = `${currentWidth}px`;
    }
  }, [panels, maxWidth, fixedPanelWidths, flyoutClassName, flyoutDOMelement]);

  return (
    <flyoutPanelsContext.Provider value={ctx}>
      <EuiFlexGroup className="fieldEditor__flyoutPanels" gutterSize="none" {...props} />
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
