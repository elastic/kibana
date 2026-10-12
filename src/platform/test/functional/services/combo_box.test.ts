/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { findMatchingComboBoxOption, getComboBoxOptionTextCandidates } from './combo_box';

describe('combobox option matching', () => {
  it('matches the dashboard label below a current-dashboard badge', () => {
    const other = { text: 'Another dashboard' };
    const current = { text: 'Current\nTest Links Panel A11y' };
    expect(findMatchingComboBoxOption([other, current], 'test links panel a11y')).to.be(current);
  });

  it('matches a username in the email without choosing a longer username', () => {
    const second = { text: 'CA\ncases all_user2\ncases_all_user2@elastic.co' };
    const first = { text: 'CA\ncases all_user\ncases_all_user@elastic.co' };
    expect(findMatchingComboBoxOption([second, first], 'cases_all_user')).to.be(first);
    expect(findMatchingComboBoxOption([first, second], 'cases_all_user2')).to.be(second);
  });

  it('prefers an exact label over a prefix match', () => {
    const longer = { text: 'Max duration' };
    const exact = { text: 'Aggregation\nMax' };
    expect(findMatchingComboBoxOption([longer, exact], 'max')).to.be(exact);
  });

  it('preserves prefix shorthand selection for interval units', () => {
    const first = { text: 'Millisecond' };
    const second = { text: 'Minute' };
    expect(findMatchingComboBoxOption([first, second], 'm')).to.be(first);
  });

  it('preserves substring searches for index names', () => {
    const option = { text: '.kibana' };
    expect(findMatchingComboBoxOption([option], 'k')).to.be(option);
  });

  it('matches separate search words across field-name punctuation', () => {
    const option = { text: 'resource.name' };
    expect(findMatchingComboBoxOption([option], 'resource name')).to.be(option);
  });

  it('does not choose an unrelated first option when a field is absent', () => {
    expect(findMatchingComboBoxOption([{ text: 'bytes' }], 'machine.os')).to.be(undefined);
    expect(findMatchingComboBoxOption([{ text: 'bytes' }], '')).to.be(undefined);
  });

  it('normalizes case and whitespace in rendered labels', () => {
    const option = { text: 'Current\r\n  Test Links Panel A11y  ' };
    expect(findMatchingComboBoxOption([option], 'TEST LINKS PANEL A11Y')).to.be(option);
  });

  it('retains the selected pill label separately from option decorations', () => {
    expect(
      getComboBoxOptionTextCandidates('CA\ncases all_user\ncases_all_user@elastic.co')
    ).to.contain('cases all_user');
    expect(getComboBoxOptionTextCandidates('Current\nTest Links Panel A11y')).to.contain(
      'test links panel a11y'
    );
  });

  it('retains the requested label when inline badges decorate the selected option', () => {
    expect(getComboBoxOptionTextCandidates('Zoom GA', 'zoom')).to.contain('zoom');
  });
});
