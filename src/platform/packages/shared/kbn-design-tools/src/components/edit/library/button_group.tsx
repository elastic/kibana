/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { EuiButtonGroup } from '@elastic/eui';

const singleOptions = [
  { id: 'dt-bg-opt1', label: 'Option one' },
  { id: 'dt-bg-opt2', label: 'Option two' },
  { id: 'dt-bg-opt3', label: 'Option three' },
];

const iconOptions = [
  { id: 'dt-bg-icon1', label: 'Align left', iconType: 'editorAlignLeft' },
  { id: 'dt-bg-icon2', label: 'Align center', iconType: 'editorAlignCenter' },
  { id: 'dt-bg-icon3', label: 'Align right', iconType: 'editorAlignRight' },
];

const multiOptions = [
  { id: 'dt-bg-multi1', label: 'Bold', iconType: 'editorBold' },
  { id: 'dt-bg-multi2', label: 'Italic', iconType: 'editorItalic' },
  { id: 'dt-bg-multi3', label: 'Underline', iconType: 'editorUnderline' },
];

export const ButtonGroupSingle = () => {
  const [selected, setSelected] = useState('dt-bg-opt2');
  return (
    <EuiButtonGroup
      legend="Single select button group"
      options={singleOptions}
      idSelected={selected}
      onChange={setSelected}
    />
  );
};

export const ButtonGroupIconOnly = () => {
  const [selected, setSelected] = useState('dt-bg-icon1');
  return (
    <EuiButtonGroup
      legend="Text alignment"
      options={iconOptions}
      idSelected={selected}
      onChange={setSelected}
      isIconOnly
    />
  );
};

export const ButtonGroupMulti = () => {
  const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>({
    'dt-bg-multi1': true,
  });
  return (
    <EuiButtonGroup
      legend="Text style"
      options={multiOptions}
      type="multi"
      idToSelectedMap={selectedMap}
      onChange={(id) => setSelectedMap((prev) => ({ ...prev, [id]: !prev[id] }))}
      isIconOnly
    />
  );
};

export const ButtonGroupCompressed = () => {
  const [selected, setSelected] = useState('dt-bg-opt1');
  return (
    <EuiButtonGroup
      legend="Compressed button group"
      options={singleOptions}
      idSelected={selected}
      onChange={setSelected}
      buttonSize="compressed"
      isFullWidth
    />
  );
};
