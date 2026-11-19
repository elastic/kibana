/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MenuItem, SecondaryMenuSection } from '../../types';

import { getPopoverSections, getSidePanelSections } from './get_menu_item_sections';

const createItem = (sections?: MenuItem['sections']): MenuItem => ({
  id: 'id',
  label: 'Label',
  href: '/label',
  iconType: 'empty',
  sections,
});

const section = (id: string): SecondaryMenuSection => ({
  id,
  items: [{ id: `${id}-item`, label: id, href: `/${id}` }],
});

describe('getPopoverSections', () => {
  it('returns the structural sections reference when there are no supplementary sections', () => {
    const sections = [section('structural')];

    expect(getPopoverSections({ ...createItem(sections), supplementarySections: [] })).toBe(
      sections
    );
  });

  it('appends supplementary sections after structural sections', () => {
    const sections = [section('structural')];
    const supplementarySections = [section('supplementary')];

    expect(getPopoverSections({ ...createItem(sections), supplementarySections })).toEqual([
      ...sections,
      ...supplementarySections,
    ]);
  });

  it('returns the supplementary sections reference when there are no structural sections', () => {
    const supplementarySections = [section('supplementary')];

    expect(getPopoverSections({ ...createItem(), supplementarySections })).toBe(
      supplementarySections
    );
  });
});

describe('getSidePanelSections', () => {
  it('returns the structural sections reference when there are no supplementary sections', () => {
    const sections = [section('structural')];

    expect(getSidePanelSections(createItem(sections))).toBe(sections);
  });

  it('appends supplementary sections after structural sections', () => {
    const sections = [section('structural')];
    const supplementarySections = [section('supplementary')];

    expect(getSidePanelSections({ ...createItem(sections), supplementarySections })).toEqual([
      ...sections,
      ...supplementarySections,
    ]);
  });

  it('does not create side panel sections from supplementary sections alone', () => {
    expect(
      getSidePanelSections({ ...createItem(), supplementarySections: [section('supplementary')] })
    ).toBeUndefined();
  });
});
