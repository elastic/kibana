/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { fireEvent, render } from '@testing-library/react';
import { GroupSelector } from '..';
import React from 'react';

const onGroupChange = jest.fn();
const testProps = {
  groupingId: 'test-grouping-id',
  fields: [
    {
      name: 'kibana.alert.rule.name',
      searchable: true,
      type: 'string',
      aggregatable: true,
      esTypes: ['keyword'],
    },
    {
      name: 'host.name',
      searchable: true,
      type: 'string',
      aggregatable: true,
      esTypes: ['keyword'],
    },
    {
      name: 'user.name',
      searchable: true,
      type: 'string',
      aggregatable: true,
      esTypes: ['keyword'],
    },
    {
      name: 'source.ip',
      searchable: true,
      type: 'ip',
      aggregatable: true,
      esTypes: ['ip'],
    },
  ],
  groupsSelected: ['kibana.alert.rule.name'],
  onGroupChange,
  options: [
    {
      label: 'Rule name',
      key: 'kibana.alert.rule.name',
    },
    {
      label: 'User name',
      key: 'user.name',
    },
    {
      label: 'Host name',
      key: 'host.name',
    },
    {
      label: 'Source IP',
      key: 'source.ip',
    },
  ],
  title: 'Group alerts by',
};
describe('group selector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('Sets the selected group from the groupSelected prop', () => {
    const { getByTestId } = render(<GroupSelector {...testProps} />);
    expect(getByTestId('group-selector-dropdown').textContent).toBe('Group alerts by: Rule name');
  });
  it('Presents correct option when group selector dropdown is clicked', () => {
    const { getByTestId } = render(<GroupSelector {...testProps} />);
    fireEvent.click(getByTestId('group-selector-dropdown'));
    [
      ...testProps.options,
      { key: 'none', label: 'None' },
      { key: 'custom', label: 'Custom field' },
    ].forEach((o) => {
      expect(getByTestId(`panel-${o.key}`).textContent).toBe(o.label);
    });
  });
  it('Presents fields dropdown when custom field option is selected', () => {
    const { getByTestId } = render(<GroupSelector {...testProps} />);
    fireEvent.click(getByTestId('group-selector-dropdown'));
    fireEvent.click(getByTestId('panel-none'));
    expect(onGroupChange).toHaveBeenCalled();
  });
  it('Labels button in correct selection order', () => {
    const { getByTestId, rerender } = render(
      <GroupSelector
        {...testProps}
        groupsSelected={[...testProps.groupsSelected, 'user.name', 'host.name']}
      />
    );
    expect(getByTestId('group-selector-dropdown').title).toEqual('Rule name, User name, Host name');
    rerender(
      <GroupSelector
        {...testProps}
        groupsSelected={[...testProps.groupsSelected, 'host.name', 'user.name']}
      />
    );
    expect(getByTestId('group-selector-dropdown').title).toEqual('Rule name, Host name, User name');
  });
  it('Labels button with selection not in options', () => {
    const { getByTestId } = render(
      <GroupSelector
        {...testProps}
        groupsSelected={[...testProps.groupsSelected, 'ugly.name', 'host.name']}
      />
    );
    expect(getByTestId('group-selector-dropdown').title).toEqual('Rule name, Host name');
  });
  it('Labels button when `none` is selected', () => {
    const { getByTestId } = render(
      <GroupSelector
        {...testProps}
        groupsSelected={[...testProps.groupsSelected, 'ugly.name', 'host.name']}
      />
    );
    expect(getByTestId('group-selector-dropdown').title).toEqual('Rule name, Host name');
  });
  describe('when maxGroupingLevels is 1', () => {
    it('Presents single option selector label when dropdown is clicked', () => {
      const { getByTestId } = render(
        <GroupSelector {...testProps} maxGroupingLevels={1} groupsSelected={[]} />
      );
      fireEvent.click(getByTestId('group-selector-dropdown'));
      expect(getByTestId('contextMenuPanelTitle').textContent).toMatch(/select grouping/i);
    });
    it('Does not disable any options when maxGroupingLevels is 1 and one option is selected', () => {
      const groupSelected = ['kibana.alert.rule.name'];

      const { getByTestId } = render(
        <GroupSelector {...testProps} maxGroupingLevels={1} groupsSelected={groupSelected} />
      );

      fireEvent.click(getByTestId('group-selector-dropdown'));

      [...testProps.options, { key: 'custom', label: 'Custom field' }].forEach((o) => {
        expect(getByTestId(`panel-${o.key}`)).not.toHaveAttribute('disabled');
      });
    });
  });
  describe('when maxGroupingLevels is greater than 1', () => {
    it('Presents select up to "X" groupings when dropdown is clicked', () => {
      const { getByTestId } = render(
        <GroupSelector {...testProps} maxGroupingLevels={3} groupsSelected={[]} />
      );
      fireEvent.click(getByTestId('group-selector-dropdown'));
      expect(getByTestId('contextMenuPanelTitle').textContent).toMatch(/select up to 3 groupings/i);
    });
    it('Disables non-selected options when maxGroupingLevels is greater than 1 and the selects items reaches the maxGroupingLevels', () => {
      const groupSelected = ['kibana.alert.rule.name', 'user.name'];

      const { getByTestId } = render(
        <GroupSelector {...testProps} maxGroupingLevels={2} groupsSelected={groupSelected} />
      );

      fireEvent.click(getByTestId('group-selector-dropdown'));

      [...testProps.options, { key: 'custom', label: 'Custom field' }].forEach((o) => {
        if (groupSelected.includes(o.key) || o.key === 'none') {
          expect(getByTestId(`panel-${o.key}`)).not.toHaveAttribute('disabled');
        } else {
          expect(getByTestId(`panel-${o.key}`)).toHaveAttribute('disabled');
        }
      });
    });
  });
});
