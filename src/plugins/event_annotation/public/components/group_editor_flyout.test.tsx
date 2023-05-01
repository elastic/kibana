/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButton, EuiFlyout } from '@elastic/eui';
import { EventAnnotationGroupConfig } from '../../common';
import { taggingApiMock } from '@kbn/saved-objects-tagging-oss-plugin/public/api.mock';
import { shallow, ShallowWrapper } from 'enzyme';
import React from 'react';
import { GroupEditorControls } from './group_editor_controls';
import { GroupEditorFlyout } from './group_editor_flyout';
import { DataView } from '@kbn/data-views-plugin/common';

const simulateButtonClick = (component: ShallowWrapper, selector: string) => {
  (component.find(selector) as ShallowWrapper<Parameters<typeof EuiButton>[0]>).prop('onClick')!(
    {} as any
  );
};

describe('group editor flyout', () => {
  const group: EventAnnotationGroupConfig = {
    annotations: [],
    description: '',
    tags: [],
    indexPatternId: 'some-id',
    title: 'My group',
    ignoreGlobalFilters: false,
  };

  const mockTaggingApi = taggingApiMock.create();

  let component: ShallowWrapper;
  let onSave: jest.Mock;
  let onClose: jest.Mock;
  let updateGroup: jest.Mock;

  beforeEach(() => {
    onSave = jest.fn();
    onClose = jest.fn();
    updateGroup = jest.fn();
    component = shallow(
      <GroupEditorFlyout
        group={group}
        onSave={onSave}
        onClose={onClose}
        updateGroup={updateGroup}
        dataViews={[
          {
            id: 'some-id',
            title: 'My Data View',
          } as DataView,
        ]}
        savedObjectsTagging={mockTaggingApi}
        createDataView={jest.fn()}
      />
    );
  });

  it('renders controls', () => {
    expect(component.find(GroupEditorControls).props()).toMatchSnapshot();
  });
  it('signals close', () => {
    component.find(EuiFlyout).prop('onClose')({} as MouseEvent);
    simulateButtonClick(component, '[data-test-subj="cancelGroupEdit"]');

    expect(onClose).toHaveBeenCalledTimes(2);
  });
  it('signals save', () => {
    simulateButtonClick(component, '[data-test-subj="saveAnnotationGroup"]');

    expect(onSave).toHaveBeenCalledTimes(1);
  });
  it('reports group updates', () => {
    const newGroup = { ...group, description: 'new description' };
    component.find(GroupEditorControls).prop('update')(newGroup);

    expect(updateGroup).toHaveBeenCalledWith(newGroup);
  });
});
