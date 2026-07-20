/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { EuiSplitButton, EuiContextMenuPanel, EuiContextMenuItem } from '@elastic/eui';

const SaveMenu = ({ onClose }: { onClose: () => void }) => (
  <EuiContextMenuPanel
    items={[
      <EuiContextMenuItem key="saveAs" onClick={onClose}>
        Save as...
      </EuiContextMenuItem>,
      <EuiContextMenuItem key="saveDraft" onClick={onClose}>
        Save as draft
      </EuiContextMenuItem>,
      <EuiContextMenuItem key="saveTemplate" onClick={onClose}>
        Save as template
      </EuiContextMenuItem>,
    ]}
  />
);

const ExportMenu = ({ onClose }: { onClose: () => void }) => (
  <EuiContextMenuPanel
    items={[
      <EuiContextMenuItem key="csv" onClick={onClose}>
        Export as CSV
      </EuiContextMenuItem>,
      <EuiContextMenuItem key="json" onClick={onClose}>
        Export as JSON
      </EuiContextMenuItem>,
      <EuiContextMenuItem key="pdf" onClick={onClose}>
        Export as PDF
      </EuiContextMenuItem>,
    ]}
  />
);

const useSplitPopover = () => {
  const [isOpen, setIsOpen] = useState(false);
  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  };
};

export const SplitButtonRegular = () => {
  const popover = useSplitPopover();
  return (
    <EuiSplitButton>
      <EuiSplitButton.ActionPrimary>Save</EuiSplitButton.ActionPrimary>
      <EuiSplitButton.ActionSecondary
        iconType="arrowDown"
        aria-label="More save options"
        onClick={popover.open}
        popoverProps={{
          isOpen: popover.isOpen,
          closePopover: popover.close,
          panelPaddingSize: 'none',
          children: <SaveMenu onClose={popover.close} />,
        }}
      />
    </EuiSplitButton>
  );
};

export const SplitButtonFill = () => {
  const popover = useSplitPopover();
  return (
    <EuiSplitButton fill>
      <EuiSplitButton.ActionPrimary>Save</EuiSplitButton.ActionPrimary>
      <EuiSplitButton.ActionSecondary
        iconType="arrowDown"
        aria-label="More save options"
        onClick={popover.open}
        popoverProps={{
          isOpen: popover.isOpen,
          closePopover: popover.close,
          panelPaddingSize: 'none',
          children: <SaveMenu onClose={popover.close} />,
        }}
      />
    </EuiSplitButton>
  );
};

export const SplitButtonSmall = () => (
  <EuiSplitButton size="s">
    <EuiSplitButton.ActionPrimary>Save</EuiSplitButton.ActionPrimary>
    <EuiSplitButton.ActionSecondary iconType="arrowDown" aria-label="More save options" />
  </EuiSplitButton>
);

export const SplitButtonDisabled = () => (
  <EuiSplitButton isDisabled>
    <EuiSplitButton.ActionPrimary>Save</EuiSplitButton.ActionPrimary>
    <EuiSplitButton.ActionSecondary iconType="arrowDown" aria-label="More save options" />
  </EuiSplitButton>
);

export const SplitButtonWithIcon = () => {
  const popover = useSplitPopover();
  return (
    <EuiSplitButton fill>
      <EuiSplitButton.ActionPrimary iconType="download">Export</EuiSplitButton.ActionPrimary>
      <EuiSplitButton.ActionSecondary
        iconType="arrowDown"
        aria-label="More export options"
        onClick={popover.open}
        popoverProps={{
          isOpen: popover.isOpen,
          closePopover: popover.close,
          panelPaddingSize: 'none',
          children: <ExportMenu onClose={popover.close} />,
        }}
      />
    </EuiSplitButton>
  );
};
