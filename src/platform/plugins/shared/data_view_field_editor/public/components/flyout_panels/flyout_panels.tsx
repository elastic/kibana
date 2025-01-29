/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  useState,
  createContext,
  useContext,
  useCallback,
  useMemo,
  useLayoutEffect,
} from 'react';
import { EuiFlexGroup, EuiFlexGroupProps, EuiFlyoutProps } from '@elastic/eui';

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

const limitWidthToWindow = (width: number, { innerWidth }: Window): number =>
  Math.min(width, innerWidth * 0.8);

export interface Props {
  /**
   * The total max width with all the panels in the DOM
   * Corresponds to the "maxWidth" prop passed to the EuiFlyout
   */
  maxWidth: EuiFlyoutProps['maxWidth'];
  /** The className selector of the flyout */
  flyoutClassName: string;
  /** The size between the panels. Corresponds to EuiFlexGroup gutterSize */
  gutterSize?: EuiFlexGroupProps['gutterSize'];
  /** Flag to indicate if the panels width are declared as fixed pixel width instead of percent */
  fixedPanelWidths?: boolean;
  children: React.ReactNode;
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

    if (typeof maxWidth === 'number') {
      if (fixedPanelWidths) {
        const totalWidth = Object.values(panels).reduce((acc, { width = 0 }) => acc + width, 0);
        currentWidth = Math.min(maxWidth, totalWidth);
        // As EUI declares both min-width and max-width on the .euiFlyout CSS class
        // we need to override  both values
        flyoutDOMelement.style.minWidth = `${limitWidthToWindow(currentWidth, window)}px`;
        flyoutDOMelement.style.maxWidth = `${limitWidthToWindow(currentWidth, window)}px`;
      } else {
        const totalPercentWidth = Math.min(
          100,
          Object.values(panels).reduce((acc, { width = 0 }) => acc + width, 0)
        );
        currentWidth = (maxWidth * totalPercentWidth) / 100;
        flyoutDOMelement.style.maxWidth = `${limitWidthToWindow(currentWidth, window)}px`;
      }
    } else {
      // maxWidth is false on smaller mobile screens when the preview panel is unused.
      // Unset custom min/max widths and let EUI's default 90vw width be used
      flyoutDOMelement.style.minWidth = '';
      flyoutDOMelement.style.maxWidth = '';
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
